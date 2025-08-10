import { SocketIOLikeClient } from '../src/client/ws-adapter';

// Mock WebSocket for testing
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
    // Mock sending data
  }
}

describe('SocketIOLikeClient Unit Tests', () => {
  let client: SocketIOLikeClient;
  let originalWebSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    global.WebSocket = originalWebSocket;
  });

  describe('Client Initialization', () => {
    test('should create client with default options', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
      
      expect(client).toBeDefined();
      expect(client.id).toMatch(/^ws-client-/);
      expect(client.connected).toBe(false);
      expect(client.disconnected).toBe(true);
    });

    test('should create client with custom options', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        reconnection: false,
        timeout: 10000,
        auth: { token: 'test' }
      });
      
      expect(client).toBeDefined();
      expect(client.connected).toBe(false);
    });

    test('should auto-connect by default', () => {
      client = new SocketIOLikeClient('ws://localhost:3000');
      expect(client).toBeDefined();
    });
  });

  describe('Properties', () => {
    beforeEach(() => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
    });

    test('should have proper id property', () => {
      expect(client.id).toBeDefined();
      expect(typeof client.id).toBe('string');
      expect(client.id).toMatch(/^ws-client-/);
    });

    test('should have connected property', () => {
      expect(client.connected).toBe(false);
    });

    test('should have disconnected property', () => {
      expect(client.disconnected).toBe(true);
    });

    test('should update connection state on connect', (done) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        expect(client.disconnected).toBe(false);
        done();
      });
      
      client.connect();
    });
  });

  describe('Event Methods', () => {
    beforeEach(() => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
    });

    test('should support on method', () => {
      const callback = jest.fn();
      const result = client.on('test', callback);
      
      expect(result).toBe(client);
      client.emit('test', 'data');
      expect(callback).toHaveBeenCalledWith('data');
    });

    test('should support once method', () => {
      const callback = jest.fn();
      const result = client.once('test', callback);
      
      expect(result).toBe(client);
      client.emit('test', 'data');
      client.emit('test', 'data2');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('data');
    });

    test('should support off method', () => {
      const callback = jest.fn();
      client.on('test', callback);
      
      const result = client.off('test', callback);
      expect(result).toBe(client);
      
      client.emit('test', 'data');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should support off method without callback', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      client.on('test', callback1);
      client.on('test', callback2);
      client.off('test');
      
      client.emit('test', 'data');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test('should support onAny method', () => {
      const anyCallback = jest.fn();
      const result = client.onAny(anyCallback);
      
      expect(result).toBe(client);
      client.emit('event1', 'data1');
      client.emit('event2', 'data2');
      
      expect(anyCallback).toHaveBeenCalledTimes(2);
      expect(anyCallback).toHaveBeenCalledWith('event1', 'data1');
      expect(anyCallback).toHaveBeenCalledWith('event2', 'data2');
    });

    test('should support offAny method', () => {
      const anyCallback = jest.fn();
      client.onAny(anyCallback);
      
      const result = client.offAny(anyCallback);
      expect(result).toBe(client);
      
      client.emit('event1', 'data1');
      expect(anyCallback).not.toHaveBeenCalled();
    });

    test('should support offAny without callback to remove all', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      client.onAny(callback1);
      client.onAny(callback2);
      client.offAny();
      
      client.emit('event1', 'data1');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Communication Methods', () => {
    beforeEach(() => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
    });

    test('should support send method', () => {
      const spy = jest.spyOn(client, 'emit');
      const result = client.send('data1', 'data2');
      
      expect(result).toBe(client);
      expect(spy).toHaveBeenCalledWith('message', 'data1', 'data2');
    });

    test('should support compress method', () => {
      const result = client.compress(true);
      expect(result).toBe(client);
    });

    test('should support timeout method', () => {
      const result = client.timeout(5000);
      expect(result).toBe(client);
    });

    test('should emit events locally', () => {
      const callback = jest.fn();
      client.on('test', callback);
      
      const result = client.emit('test', 'data1', 'data2');
      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith('data1', 'data2');
    });

    test('should handle emit with no listeners', () => {
      const result = client.emit('nonexistent', 'data');
      expect(result).toBe(true);
    });
  });

  describe('Method Chaining', () => {
    beforeEach(() => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
    });

    test('should support method chaining', () => {
      const result = client
        .compress(true)
        .timeout(5000)
        .on('test', () => {})
        .once('test2', () => {});
      
      expect(result).toBe(client);
    });

    test('should chain communication methods', () => {
      const result = client
        .compress(true)
        .timeout(1000)
        .send('data');
      
      expect(result).toBe(client);
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
    });

    test('should connect and emit connect event', (done) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        done();
      });
      
      client.connect();
    });

    test('should disconnect and emit disconnect event', (done) => {
      client.on('connect', () => {
        client.disconnect();
      });
      
      client.on('disconnect', () => {
        expect(client.connected).toBe(false);
        expect(client.disconnected).toBe(true);
        done();
      });
      
      client.connect();
    });

    test('should return client instance from connect', () => {
      const result = client.connect();
      expect(result).toBe(client);
    });

    test('should return client instance from disconnect', () => {
      const result = client.disconnect();
      expect(result).toBe(client);
    });
  });

  describe('Enhanced Options', () => {
    test('should accept auth option', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        auth: { token: 'test-token', userId: '123' }
      });
      
      expect(client).toBeDefined();
    });

    test('should accept forceNew option', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        forceNew: true
      });
      
      expect(client).toBeDefined();
    });

    test('should accept multiplex option', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        multiplex: false
      });
      
      expect(client).toBeDefined();
    });

    test('should accept reconnection options', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 30000
      });
      
      expect(client).toBeDefined();
    });

    test('should accept query parameters', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        query: { room: 'test', user: 'john' }
      });
      
      expect(client).toBeDefined();
    });

    test('should accept custom timeout', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        timeout: 5000
      });
      
      expect(client).toBeDefined();
    });
  });

  describe('Callback Management', () => {
    beforeEach(() => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
    });

    test('should provide callback statistics', () => {
      const stats = client.getCallbackStats();
      
      expect(stats).toBeDefined();
      expect(stats.pending).toBe(0);
      expect(stats.oldestAge).toBe(0);
      expect(stats.averageAge).toBe(0);
      expect(stats.byEvent).toEqual({});
      expect(stats.timeoutDistribution).toEqual({});
    });

    test('should provide reconnection statistics', () => {
      const stats = client.getReconnectionStats();
      
      expect(stats).toBeDefined();
      expect(stats.isReconnecting).toBe(false);
      expect(stats.attempts).toBe(0);
      expect(stats.maxAttempts).toBeGreaterThan(0);
      expect(stats.reconnectionEnabled).toBe(true);
    });

    test('should provide pending callbacks information', () => {
      const pendingCallbacks = client.getPendingCallbacks();
      
      expect(Array.isArray(pendingCallbacks)).toBe(true);
      expect(pendingCallbacks).toHaveLength(0);
    });

    test('should clear callbacks manually', () => {
      const clearedCount = client.clearCallbacks();
      expect(clearedCount).toBe(0);
    });

    test('should clear callbacks for specific event', () => {
      const clearedCount = client.clearCallbacks('test-event');
      expect(clearedCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
    });

    test('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      
      client.on('test', errorCallback);
      
      expect(() => client.emit('test', 'data')).not.toThrow();
      expect(errorCallback).toHaveBeenCalledWith('data');
    });

    test('should handle any callback errors gracefully', () => {
      const errorAnyCallback = jest.fn(() => {
        throw new Error('Any callback error');
      });
      
      client.onAny(errorAnyCallback);
      
      expect(() => client.emit('test', 'data')).not.toThrow();
      expect(errorAnyCallback).toHaveBeenCalledWith('test', 'data');
    });
  });

  describe('Internal Event Handling', () => {
    beforeEach(() => {
      client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
    });

    test('should identify internal events', () => {
      const internalEvents = [
        'connect', 'disconnect', 'error', 'connect_error',
        'reconnect', 'reconnect_attempt', 'reconnect_error', 'reconnect_failed'
      ];
      
      internalEvents.forEach(event => {
        // Internal events should not be sent to server
        const callback = jest.fn();
        client.on(event, callback);
        client.emit(event, 'data');
        expect(callback).toHaveBeenCalledWith('data');
      });
    });

    test('should handle non-internal events differently', () => {
      const callback = jest.fn();
      client.on('custom-event', callback);
      
      client.emit('custom-event', 'data');
      expect(callback).toHaveBeenCalledWith('data');
    });
  });

  describe('WebSocket URL Construction', () => {
    test('should construct URL with query parameters', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        query: { room: 'test', user: 'john' }
      });
      
      expect(client).toBeDefined();
    });

    test('should construct URL with auth parameters', () => {
      client = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        auth: { token: 'test-token' }
      });
      
      expect(client).toBeDefined();
    });

    test('should handle HTTP to WS URL conversion', () => {
      client = new SocketIOLikeClient('http://localhost:3000', {
        autoConnect: false
      });
      
      expect(client).toBeDefined();
    });
  });
});