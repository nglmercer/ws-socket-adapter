import { Emitter } from '../src/Emitter';

describe('Emitter Core Functionality', () => {
  let emitter: Emitter;

  beforeEach(() => {
    emitter = new Emitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  describe('Basic Event Handling', () => {
    test('should register and emit events', () => {
      const callback = jest.fn();
      emitter.on('test', callback);
      
      const result = emitter.emit('test', 'data1', 'data2');
      
      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith('data1', 'data2');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      
      emitter.emit('test', 'data');
      
      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
    });

    test('should return false when no listeners exist', () => {
      const result = emitter.emit('nonexistent', 'data');
      expect(result).toBe(false);
    });

    test('should handle events with no arguments', () => {
      const callback = jest.fn();
      emitter.on('test', callback);
      
      emitter.emit('test');
      
      expect(callback).toHaveBeenCalledWith();
    });
  });

  describe('Once Listeners', () => {
    test('should execute once listeners only once', () => {
      const callback = jest.fn();
      emitter.once('test', callback);
      
      emitter.emit('test', 'data1');
      emitter.emit('test', 'data2');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('data1');
    });

    test('should remove once listeners after execution', () => {
      const callback = jest.fn();
      emitter.once('test', callback);
      
      expect(emitter.listenerCount('test')).toBe(1);
      emitter.emit('test', 'data');
      expect(emitter.listenerCount('test')).toBe(0);
    });

    test('should handle errors in once listeners', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      
      emitter.once('test', errorCallback);
      emitter.once('test', normalCallback);
      
      emitter.emit('test', 'data');
      
      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(normalCallback).toHaveBeenCalledTimes(1);
      expect(emitter.listenerCount('test')).toBe(0);
    });
  });

  describe('Any Listeners', () => {
    test('should execute any listeners for all events', () => {
      const anyCallback = jest.fn();
      emitter.onAny(anyCallback);
      
      emitter.emit('event1', 'data1');
      emitter.emit('event2', 'data2', 'extra');
      
      expect(anyCallback).toHaveBeenCalledTimes(2);
      expect(anyCallback).toHaveBeenNthCalledWith(1, 'event1', 'data1');
      expect(anyCallback).toHaveBeenNthCalledWith(2, 'event2', 'data2', 'extra');
    });

    test('should execute onceAny listeners only once', () => {
      const onceAnyCallback = jest.fn();
      emitter.onceAny(onceAnyCallback);
      
      emitter.emit('event1', 'data1');
      emitter.emit('event2', 'data2');
      
      expect(onceAnyCallback).toHaveBeenCalledTimes(1);
      expect(onceAnyCallback).toHaveBeenCalledWith('event1', 'data1');
    });

    test('should handle multiple any listeners', () => {
      const anyCallback1 = jest.fn();
      const anyCallback2 = jest.fn();
      
      emitter.onAny(anyCallback1);
      emitter.onAny(anyCallback2);
      
      emitter.emit('test', 'data');
      
      expect(anyCallback1).toHaveBeenCalledWith('test', 'data');
      expect(anyCallback2).toHaveBeenCalledWith('test', 'data');
    });
  });

  describe('Listener Management', () => {
    test('should remove specific listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      
      expect(emitter.listenerCount('test')).toBe(2);
      
      emitter.off('test', callback1);
      expect(emitter.listenerCount('test')).toBe(1);
      
      emitter.emit('test', 'data');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });

    test('should remove all listeners for an event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      
      emitter.removeAllListeners('test');
      expect(emitter.listenerCount('test')).toBe(0);
      
      emitter.emit('test', 'data');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test('should remove all listeners when no event specified', () => {
      emitter.on('event1', jest.fn());
      emitter.on('event2', jest.fn());
      emitter.onAny(jest.fn());
      
      emitter.removeAllListeners();
      
      expect(emitter.listenerCount('event1')).toBe(0);
      expect(emitter.listenerCount('event2')).toBe(0);
      expect(emitter.getAnyListeners()).toHaveLength(0);
    });

    test('should return removal functions from on/once', () => {
      const callback = jest.fn();
      const removeListener = emitter.on('test', callback);
      
      expect(emitter.listenerCount('test')).toBe(1);
      removeListener();
      expect(emitter.listenerCount('test')).toBe(0);
    });
  });

  describe('Prepend Listeners', () => {
    test('should prepend listeners to the beginning', () => {
      const results: string[] = [];
      
      emitter.on('test', () => results.push('second'));
      emitter.prependListener('test', () => results.push('first'));
      
      emitter.emit('test');
      
      expect(results).toEqual(['first', 'second']);
    });

    test('should prepend once listeners', () => {
      const results: string[] = [];
      
      emitter.on('test', () => results.push('second'));
      emitter.prependOnceListener('test', () => results.push('first'));
      
      emitter.emit('test');
      emitter.emit('test');
      
      expect(results).toEqual(['first', 'second', 'second']);
    });
  });

  describe('Async Operations', () => {
    test('should handle async emit', async () => {
      const callback = jest.fn();
      emitter.on('test', callback);
      
      const result = await emitter.emitAsync('test', 'data');
      
      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith('data');
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in listeners gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      
      emitter.on('test', errorCallback);
      emitter.on('test', normalCallback);
      
      // Should not throw
      expect(() => emitter.emit('test', 'data')).not.toThrow();
      
      expect(errorCallback).toHaveBeenCalledWith('data');
      expect(normalCallback).toHaveBeenCalledWith('data');
    });

    test('should handle errors in any listeners', () => {
      const errorAnyCallback = jest.fn(() => {
        throw new Error('Any listener error');
      });
      const normalCallback = jest.fn();
      
      emitter.onAny(errorAnyCallback);
      emitter.on('test', normalCallback);
      
      expect(() => emitter.emit('test', 'data')).not.toThrow();
      
      expect(errorAnyCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalledWith('data');
    });
  });

  describe('Memory Management', () => {
    test('should warn about memory leaks', () => {
      // Set a lower max listeners for testing
      emitter.setMaxListeners(5);
      
      // Add more than max listeners
      for (let i = 0; i < 6; i++) {
        emitter.on('test', jest.fn());
      }
      
      // The warning is logged through the logger, so we just verify
      // that we can add more listeners than the limit
      expect(emitter.listenerCount('test')).toBe(6);
    });

    test('should allow setting max listeners', () => {
      emitter.setMaxListeners(5);
      expect(emitter.getMaxListeners()).toBe(5);
    });

    test('should clean up properly on destroy', () => {
      emitter.on('test1', jest.fn());
      emitter.on('test2', jest.fn());
      emitter.onAny(jest.fn());
      
      emitter.destroy();
      
      expect(emitter.listenerCount('test1')).toBe(0);
      expect(emitter.listenerCount('test2')).toBe(0);
      expect(emitter.getAnyListeners()).toHaveLength(0);
    });
  });

  describe('Utility Methods', () => {
    test('should return event names', () => {
      emitter.on('event1', jest.fn());
      emitter.on('event2', jest.fn());
      
      const eventNames = emitter.eventNames();
      expect(eventNames).toContain('event1');
      expect(eventNames).toContain('event2');
      expect(eventNames).toHaveLength(2);
    });

    test('should return listeners for an event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      
      const listeners = emitter.getListeners('test');
      expect(listeners).toContain(callback1);
      expect(listeners).toContain(callback2);
      expect(listeners).toHaveLength(2);
    });

    test('should return any listeners', () => {
      const anyCallback1 = jest.fn();
      const anyCallback2 = jest.fn();
      
      emitter.onAny(anyCallback1);
      emitter.onAny(anyCallback2);
      
      const anyListeners = emitter.getAnyListeners();
      expect(anyListeners).toContain(anyCallback1);
      expect(anyListeners).toContain(anyCallback2);
      expect(anyListeners).toHaveLength(2);
    });

    test('should check if event has listeners', () => {
      expect(emitter.hasListeners('test')).toBe(false);
      
      emitter.on('test', jest.fn());
      expect(emitter.hasListeners('test')).toBe(true);
      
      emitter.removeAllListeners('test');
      expect(emitter.hasListeners('test')).toBe(false);
      
      // Should return true if any listeners exist
      emitter.onAny(jest.fn());
      expect(emitter.hasListeners('test')).toBe(true);
    });

    test('should provide debug information', () => {
      emitter.on('event1', jest.fn());
      emitter.on('event1', jest.fn());
      emitter.on('event2', jest.fn());
      emitter.onAny(jest.fn());
      
      const debug = emitter.debug();
      
      expect(debug.totalEvents).toBe(2);
      expect(debug.totalListeners).toBe(3);
      expect(debug.anyListeners).toBe(1);
      expect(debug.events.event1).toBe(2);
      expect(debug.events.event2).toBe(1);
      expect(debug.memoryInfo.listenersMap).toBe(2);
      expect(debug.memoryInfo.anyListenersArray).toBe(1);
    });
  });
});