import { SocketIOLikeClient } from '../src/client/ws-adapter';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public url: string) {
    // Simulate successful connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({} as Event);
      }
    }, 10);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || '', wasClean: true } as CloseEvent);
    }
  }

  send(data: string) {
    // Mock sending data - can be overridden in tests
  }
}

describe('SocketIOLikeClient Callback Improvements', () => {
  let client: SocketIOLikeClient;
  let originalWebSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    jest.useRealTimers();
    global.WebSocket = originalWebSocket;
  });

  describe('Callback Timeout Handling', () => {
    test('should timeout callbacks with custom timeout', (done) => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        timeout: 1000
      });

      client.on('connect', () => {
        client.timeout(500).emit('test-event', 'data', (error: any) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain('Callback timeout after 500ms');
          expect(error.code).toBe('CALLBACK_TIMEOUT');
          expect(error.callbackId).toBeDefined();
          done();
        });

        // Fast-forward time to trigger timeout
        jest.advanceTimersByTime(500);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should use default timeout when not specified', (done) => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        timeout: 1000
      });

      client.on('connect', () => {
        client.emit('test-event', 'data', (error: any) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain('Callback timeout after 1000ms');
          expect(error.code).toBe('CALLBACK_TIMEOUT');
          done();
        });

        // Fast-forward time to trigger timeout
        jest.advanceTimersByTime(1000);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should clear timeout when callback is executed', (done) => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      // Mock WebSocket to simulate server response
      (global as any).WebSocket = class extends MockWebSocket {
        send(data: string) {
          const message = JSON.parse(data);
          if (message.callbackId) {
            // Simulate server response after 100ms
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage({
                  data: JSON.stringify({
                    event: 'callback-response',
                    callbackId: message.callbackId,
                    payload: ['success', 'response data']
                  })
                } as MessageEvent);
              }
            }, 100);
          }
        }
      };

      client.on('connect', () => {
        client.timeout(1000).emit('test-event', 'data', (response1: string, response2: string) => {
          expect(response1).toBe('success');
          expect(response2).toBe('response data');
          done();
        });

        // Fast-forward time to trigger server response
        jest.advanceTimersByTime(100);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });
  });

  describe('Callback Error Handling', () => {
    test('should handle callback execution errors', (done) => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      client.on('error', (error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Callback execution failed');
        expect(error.code).toBe('CALLBACK_EXECUTION_ERROR');
        expect(error.type).toBe('CallbackError');
        expect(error.callbackId).toBeDefined();
        expect(error.event).toBe('test-event');
        done();
      });

      // Mock WebSocket to simulate server response
      (global as any).WebSocket = class extends MockWebSocket {
        send(data: string) {
          const message = JSON.parse(data);
          if (message.callbackId) {
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage({
                  data: JSON.stringify({
                    event: 'callback-response',
                    callbackId: message.callbackId,
                    payload: ['response']
                  })
                } as MessageEvent);
              }
            }, 10);
          }
        }
      };

      client.on('connect', () => {
        client.emit('test-event', 'data', () => {
          throw new Error('Callback execution error');
        });

        jest.advanceTimersByTime(50);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should handle server callback errors', (done) => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      // Mock WebSocket to simulate server error response
      (global as any).WebSocket = class extends MockWebSocket {
        send(data: string) {
          const message = JSON.parse(data);
          if (message.callbackId) {
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage({
                  data: JSON.stringify({
                    event: 'callback-response',
                    callbackId: message.callbackId,
                    error: {
                      message: 'Server processing error',
                      code: 'SERVER_ERROR'
                    }
                  })
                } as MessageEvent);
              }
            }, 10);
          }
        }
      };

      client.on('connect', () => {
        client.emit('test-event', 'data', (error: any) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Server processing error');
          expect(error.code).toBe('SERVER_ERROR');
          expect(error.type).toBe('CallbackError');
          done();
        });

        jest.advanceTimersByTime(50);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should handle timeout callback execution errors', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      const errorSpy = jest.fn();
      client.on('error', errorSpy);

      client.on('connect', () => {
        client.timeout(100).emit('test-event', 'data', () => {
          throw new Error('Timeout callback error');
        });

        jest.advanceTimersByTime(100);
        
        expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Timeout callback execution failed',
          code: 'TIMEOUT_CALLBACK_EXECUTION_ERROR',
          type: 'CallbackError',
          event: 'test-event'
        }));
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });
  });

  describe('Callback Cleanup', () => {
    test('should clean up callbacks on disconnect', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      const callbackSpy = jest.fn();

      client.on('connect', () => {
        client.emit('test-event', 'data', callbackSpy);
        
        // Verify callback is pending
        const stats = client.getCallbackStats();
        expect(stats.pending).toBe(1);
        
        client.disconnect();
        
        expect(callbackSpy).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Socket disconnected',
          code: 'SOCKET_DISCONNECTED',
          callbackId: expect.any(String)
        }));
        
        // Verify callbacks are cleared
        const statsAfter = client.getCallbackStats();
        expect(statsAfter.pending).toBe(0);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should clean up stale callbacks periodically', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        timeout: 120000 // Set a very high timeout so it doesn't interfere
      });

      const callbackSpy = jest.fn();

      client.on('connect', () => {
        client.emit('test-event', 'data', callbackSpy);
        
        // Verify callback is pending
        expect(client.getCallbackStats().pending).toBe(1);
        
        // Fast-forward time to make callback stale (older than 60 seconds)
        jest.advanceTimersByTime(61000);
        
        // Trigger periodic cleanup (runs every 30 seconds)
        jest.advanceTimersByTime(30000);
        
        // Verify callback was cleaned up
        expect(client.getCallbackStats().pending).toBe(0);
        expect(callbackSpy).toHaveBeenCalledWith(expect.objectContaining({
          code: 'CALLBACK_STALE'
        }));
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should provide enhanced callback statistics', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      client.on('connect', () => {
        // Add multiple callbacks with different timeouts
        client.timeout(1000).emit('event1', 'data', () => {});
        client.timeout(5000).emit('event2', 'data', () => {});
        client.emit('event1', 'data', () => {}); // Uses default timeout
        
        const stats = client.getCallbackStats();
        expect(stats.pending).toBe(3);
        expect(stats.oldestAge).toBeGreaterThanOrEqual(0);
        expect(stats.averageAge).toBeGreaterThanOrEqual(0);
        expect(stats.byEvent).toEqual({ event1: 2, event2: 1 });
        expect(stats.timeoutDistribution).toBeDefined();
        
        // Fast-forward time
        jest.advanceTimersByTime(5000);
        
        const statsAfter = client.getCallbackStats();
        expect(statsAfter.oldestAge).toBeGreaterThanOrEqual(5000);
        expect(statsAfter.averageAge).toBeGreaterThanOrEqual(5000);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should provide detailed pending callbacks information', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      client.on('connect', () => {
        client.timeout(1000).emit('event1', 'data', () => {});
        client.timeout(2000).emit('event2', 'data', () => {});
        
        const pendingCallbacks = client.getPendingCallbacks();
        expect(pendingCallbacks).toHaveLength(2);
        expect(pendingCallbacks[0]).toMatchObject({
          callbackId: expect.any(String),
          event: expect.any(String),
          age: expect.any(Number),
          timeout: expect.any(Number),
          retries: 0
        });
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });
  });

  describe('Memory Leak Prevention', () => {
    test('should not accumulate callbacks indefinitely', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      client.on('connect', () => {
        // Add many callbacks
        for (let i = 0; i < 100; i++) {
          client.emit(`event${i}`, 'data', () => {});
        }
        
        let initialStats = client.getCallbackStats();
        expect(initialStats.pending).toBe(100);
        
        // Fast-forward to trigger timeouts
        jest.advanceTimersByTime(25000); // Default timeout is 20s
        
        let statsAfterTimeout = client.getCallbackStats();
        expect(statsAfterTimeout.pending).toBe(0);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should allow manual callback cleanup', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      const callbackSpy = jest.fn();

      client.on('connect', () => {
        client.emit('event1', 'data', callbackSpy);
        client.emit('event2', 'data', callbackSpy);
        client.emit('event1', 'data', callbackSpy);
        
        expect(client.getCallbackStats().pending).toBe(3);
        
        // Clear callbacks for specific event
        const clearedCount = client.clearCallbacks('event1');
        expect(clearedCount).toBe(2);
        expect(client.getCallbackStats().pending).toBe(1);
        
        // Verify callbacks were called with clear error
        expect(callbackSpy).toHaveBeenCalledTimes(2);
        expect(callbackSpy).toHaveBeenCalledWith(expect.objectContaining({
          code: 'CALLBACK_CLEARED',
          type: 'CallbackError',
          event: 'event1'
        }));
        
        // Clear all remaining callbacks
        const remainingCleared = client.clearCallbacks();
        expect(remainingCleared).toBe(1);
        expect(client.getCallbackStats().pending).toBe(0);
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should enforce callback limits', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false
      });

      const callbackSpy = jest.fn();

      client.on('connect', () => {
        // Add callbacks
        for (let i = 0; i < 10; i++) {
          client.emit(`event${i}`, 'data', callbackSpy);
        }
        
        expect(client.getCallbackStats().pending).toBe(10);
        
        // Set limits that should trigger cleanup
        client.setCallbackLimits(5, 300000); // Max 5 callbacks, 5 minutes max age
        
        expect(client.getCallbackStats().pending).toBe(5);
        expect(callbackSpy).toHaveBeenCalledTimes(5);
        expect(callbackSpy).toHaveBeenCalledWith(expect.objectContaining({
          code: 'CALLBACK_LIMIT_EXCEEDED',
          type: 'CallbackError'
        }));
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should enforce age-based callback limits', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        timeout: 60000 // High timeout to prevent normal timeout
      });

      const callbackSpy = jest.fn();

      client.on('connect', () => {
        client.emit('event1', 'data', callbackSpy);
        
        // Fast-forward time to make callback old
        jest.advanceTimersByTime(10000);
        
        client.emit('event2', 'data', callbackSpy);
        
        expect(client.getCallbackStats().pending).toBe(2);
        
        // Set age limit that should remove the old callback
        client.setCallbackLimits(1000, 5000); // Max age 5 seconds
        
        expect(client.getCallbackStats().pending).toBe(1);
        expect(callbackSpy).toHaveBeenCalledWith(expect.objectContaining({
          code: 'CALLBACK_LIMIT_EXCEEDED',
          type: 'CallbackError'
        }));
      });

      client.connect();
      jest.advanceTimersByTime(100);
    });
  });
});