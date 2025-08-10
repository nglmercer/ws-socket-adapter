import { SocketIOLikeClient, io } from '../src/client/ws-adapter';

describe('SocketIOLikeClient Enhanced Methods', () => {
  let client: SocketIOLikeClient;

  beforeEach(() => {
    // Create client without auto-connect for testing
    client = new SocketIOLikeClient('ws://localhost:3000', { autoConnect: false });
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe('Properties', () => {
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
  });

  describe('Event Methods', () => {
    test('should support once method', () => {
      const callback = jest.fn();
      client.once('test', callback);
      
      client.emit('test', 'data');
      client.emit('test', 'data2');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('data');
    });

    test('should support onAny method', () => {
      const anyCallback = jest.fn();
      client.onAny(anyCallback);
      
      client.emit('event1', 'data1');
      client.emit('event2', 'data2');
      
      expect(anyCallback).toHaveBeenCalledTimes(2);
      expect(anyCallback).toHaveBeenCalledWith('event1', 'data1');
      expect(anyCallback).toHaveBeenCalledWith('event2', 'data2');
    });

    test('should support offAny method', () => {
      const anyCallback = jest.fn();
      client.onAny(anyCallback);
      client.offAny(anyCallback);
      
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
    test('should support send method', () => {
      const spy = jest.spyOn(client, 'emit');
      client.send('data1', 'data2');
      
      expect(spy).toHaveBeenCalledWith('message', 'data1', 'data2');
    });

    test('should support compress method', () => {
      const result = client.compress(true);
      expect(result).toBe(client); // Should return this for chaining
    });

    test('should support timeout method', () => {
      const result = client.timeout(5000);
      expect(result).toBe(client); // Should return this for chaining
    });
  });

  describe('Method Chaining', () => {
    test('should support method chaining', () => {
      const result = client
        .compress(true)
        .timeout(5000)
        .on('test', () => {})
        .once('test2', () => {});
      
      expect(result).toBe(client);
    });
  });

  describe('Enhanced Options', () => {
    test('should accept auth option', () => {
      const clientWithAuth = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        auth: { token: 'test-token', userId: '123' }
      });
      
      expect(clientWithAuth).toBeDefined();
      clientWithAuth.disconnect();
    });

    test('should accept forceNew option', () => {
      const clientWithForceNew = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        forceNew: true
      });
      
      expect(clientWithForceNew).toBeDefined();
      clientWithForceNew.disconnect();
    });

    test('should accept multiplex option', () => {
      const clientWithMultiplex = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        multiplex: false
      });
      
      expect(clientWithMultiplex).toBeDefined();
      clientWithMultiplex.disconnect();
    });

    test('should accept reconnection options', () => {
      const clientWithReconnection = new SocketIOLikeClient('ws://localhost:3000', {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 30000
      });
      
      expect(clientWithReconnection).toBeDefined();
      clientWithReconnection.disconnect();
    });
  });
});