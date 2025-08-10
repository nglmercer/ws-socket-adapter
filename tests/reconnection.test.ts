import { SocketIOLikeClient } from '../src/client/ws-adapter';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public url: string) {}

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || '', wasClean: true } as CloseEvent);
    }
  }

  send(data: string) {}
}

describe('SocketIOLikeClient Reconnection and Error Handling', () => {
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

  describe('Connection Timeout', () => {
    test('should emit connect_error on connection timeout with enhanced error info', (done) => {
      client = new SocketIOLikeClient('ws://nonexistent:9999', {
        autoConnect: false,
        timeout: 1000
      });

      client.on('connect_error', (error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Connection timeout');
        expect((error as any).code).toBe('CONNECTION_TIMEOUT');
        expect((error as any).type).toBe('TransportError');
        expect((error as any).description).toContain('Connection timeout after 1000ms');
        done();
      });

      // Override WebSocket to stay in CONNECTING state
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          // Stay in CONNECTING state and don't trigger any events
          this.readyState = MockWebSocket.CONNECTING;
        }
        
        close() {
          // Don't change state or trigger events when closed due to timeout
        }
      };

      client.connect();
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1000);
    });

    test('should not timeout if connection succeeds in time', (done) => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        timeout: 1000
      });

      let timeoutFired = false;
      client.on('connect_error', () => {
        timeoutFired = true;
      });

      client.on('connect', () => {
        expect(timeoutFired).toBe(false);
        done();
      });

      // Override WebSocket to connect successfully after 500ms
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
          }, 500);
        }
      };

      client.connect();
      jest.advanceTimersByTime(1000);
    });
  });

  describe('Reconnection Logic', () => {
    test('should respect reconnection disabled option', () => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        reconnection: false
      });

      const reconnectAttemptSpy = jest.fn();
      client.on('reconnect_attempt', reconnectAttemptSpy);

      client.connect();
      
      // Simulate close event
      if (client['ws']) {
        client['ws'].onclose?.({ reason: 'Connection failed', wasClean: false, code: 1006 } as any);
      }

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      expect(reconnectAttemptSpy).not.toHaveBeenCalled();
    });

    test('should emit reconnect_failed after max attempts with enhanced error', (done) => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 2,
        reconnectionDelay: 100
      });

      let attemptCount = 0;
      client.on('reconnect_attempt', () => {
        attemptCount++;
      });

      client.on('reconnect_failed', (error) => {
        expect(attemptCount).toBe(2);
        expect(error).toBeInstanceOf(Error);
        expect((error as any).code).toBe('RECONNECT_FAILED');
        expect((error as any).type).toBe('ReconnectionError');
        expect((error as any).attempts).toBe(2);
        expect((error as any).maxAttempts).toBe(2);
        done();
      });

      // Override WebSocket to simulate failures
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          // Simulate immediate failure
          setTimeout(() => {
            if (this.onclose) {
              this.onclose({ reason: 'Connection failed', wasClean: false, code: 1006 } as any);
            }
          }, 10);
        }
      };

      client.connect();
      
      // Fast-forward through all reconnection attempts
      jest.advanceTimersByTime(10000);
    });

    test('should use exponential backoff with randomization', () => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5
      });

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, delay);
      }) as any;

      // Override WebSocket to simulate failures
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onclose) {
              this.onclose({ reason: 'Connection failed', wasClean: false, code: 1006 } as any);
            }
          }, 10);
        }
      };

      client.connect();
      jest.advanceTimersByTime(20000);

      // Should have delays for reconnection attempts
      const reconnectionDelays = delays.filter(d => d > 100); // Filter out small delays
      expect(reconnectionDelays.length).toBeGreaterThan(0);
      
      // Each delay should be different due to randomization
      if (reconnectionDelays.length > 1) {
        expect(reconnectionDelays[0]).not.toBe(reconnectionDelays[1]);
      }

      global.setTimeout = originalSetTimeout;
    });

    test('should not reconnect on normal closure', () => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        reconnection: true
      });

      const reconnectAttemptSpy = jest.fn();
      client.on('reconnect_attempt', reconnectAttemptSpy);

      client.connect();
      
      // Simulate normal close event (code 1000)
      if (client['ws']) {
        client['ws'].onclose?.({ reason: 'Normal closure', wasClean: true, code: 1000 } as any);
      }

      jest.advanceTimersByTime(10000);
      expect(reconnectAttemptSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Event Handling', () => {
    test('should emit connect_error for initial connection failures with enhanced error info', (done) => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false
      });

      client.on('connect_error', (error) => {
        expect(error).toBeDefined();
        expect((error as any).code).toBe('WEBSOCKET_ERROR');
        expect((error as any).type).toBe('TransportError');
        expect((error as any).url).toBe('ws://localhost:9999');
        expect((error as any).timestamp).toBeDefined();
        expect((error as any).attempt).toBe(0);
        done();
      });

      // Override WebSocket to fail immediately
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Connection failed') as any);
            }
          }, 10);
        }
      };

      client.connect();
      jest.advanceTimersByTime(100);
    });

    test('should emit reconnect_error during reconnection attempts', (done) => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 2,
        reconnectionDelay: 100
      });

      let connectErrorCount = 0;
      let reconnectErrorCount = 0;

      client.on('connect_error', () => {
        connectErrorCount++;
      });

      client.on('reconnect_error', (error) => {
        reconnectErrorCount++;
        expect((error as any).attempt).toBeGreaterThan(0);
        if (reconnectErrorCount === 1) {
          done();
        }
      });

      // Override WebSocket to fail consistently
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Connection failed') as any);
            }
          }, 10);
        }
      };

      client.connect();
      jest.advanceTimersByTime(1000);
    });

    test('should emit generic error event for all connection errors', (done) => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false
      });

      client.on('error', (error) => {
        expect(error).toBeDefined();
        expect((error as any).code).toBe('WEBSOCKET_ERROR');
        done();
      });

      // Override WebSocket to fail immediately
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Connection failed') as any);
            }
          }, 10);
        }
      };

      client.connect();
      jest.advanceTimersByTime(100);
    });
  });

  describe('Manual Disconnect', () => {
    test('should not attempt reconnection after manual disconnect', () => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        reconnection: true
      });

      const reconnectAttemptSpy = jest.fn();
      client.on('reconnect_attempt', reconnectAttemptSpy);

      client.connect();
      client.disconnect();

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      expect(reconnectAttemptSpy).not.toHaveBeenCalled();
    });

    test('should clean up pending callbacks on disconnect with enhanced error info', () => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false
      });

      const callbackSpy = jest.fn();
      
      // Add a pending callback with the new structure
      const mockTimeoutId = setTimeout(() => {}, 1000);
      client['pendingCallbacks'].set('test-callback', {
        callback: callbackSpy,
        timeoutId: mockTimeoutId,
        timestamp: Date.now(),
        event: 'test-event',
        timeout: 5000,
        retries: 0
      });
      
      client.disconnect();

      expect(callbackSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Socket disconnected',
        code: 'SOCKET_DISCONNECTED',
        callbackId: 'test-callback',
        timestamp: expect.any(Number)
      }));
      expect(client['pendingCallbacks'].size).toBe(0);
    });
  });

  describe('Reconnection Statistics', () => {
    test('should provide accurate reconnection statistics', () => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      let stats = client.getReconnectionStats();
      expect(stats.isReconnecting).toBe(false);
      expect(stats.attempts).toBe(0);
      expect(stats.maxAttempts).toBe(5);
      expect(stats.reconnectionEnabled).toBe(true);
      expect(stats.nextDelay).toBeUndefined();

      // Override WebSocket to fail and trigger reconnection
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onclose) {
              this.onclose({ reason: 'Connection failed', wasClean: false, code: 1006 } as any);
            }
          }, 10);
        }
      };

      client.connect();
      jest.advanceTimersByTime(100);

      stats = client.getReconnectionStats();
      expect(stats.isReconnecting).toBe(true);
      expect(stats.attempts).toBe(0);
      expect(stats.nextDelay).toBeDefined();
      expect(stats.nextDelay).toBeGreaterThan(0);
    });

    test('should show reconnection disabled when configured', () => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false,
        reconnection: false
      });

      const stats = client.getReconnectionStats();
      expect(stats.reconnectionEnabled).toBe(false);
    });
  });

  describe('Disconnect Reason Handling', () => {
    test('should provide proper disconnect reasons based on close codes', () => {
      client = new SocketIOLikeClient('ws://localhost:9999', {
        autoConnect: false
      });

      const disconnectSpy = jest.fn();
      client.on('disconnect', disconnectSpy);

      client.connect();

      // Test different close codes
      const testCases = [
        { code: 1000, expectedReason: 'Normal closure' },
        { code: 1001, expectedReason: 'Going away' },
        { code: 1006, expectedReason: 'Abnormal closure' },
        { code: 1011, expectedReason: 'Internal server error' }
      ];

      testCases.forEach(({ code, expectedReason }, index) => {
        if (client['ws']) {
          client['ws'].onclose?.({ 
            reason: '', 
            wasClean: code === 1000, 
            code 
          } as any);
        }

        expect(disconnectSpy).toHaveBeenNthCalledWith(
          index + 1,
          expectedReason,
          expect.objectContaining({
            code,
            wasClean: code === 1000,
            timestamp: expect.any(Number)
          })
        );
      });
    });
  });
});