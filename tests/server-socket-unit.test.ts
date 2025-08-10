import { SocketIOLikeServer, SocketIOLikeSocket } from '../src/server/SocketIOLikeAdapter';
import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

// Mock nanoid to avoid ES module issues
jest.mock('nanoid', () => ({
  nanoid: () => 'mock-id-' + Math.random().toString(36).substring(2, 11)
}));

// Mock WebSocket and WebSocketServer
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
    OPEN: 1,
    CLOSED: 3
  })),
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn()
  }))
}));

describe('SocketIOLikeServer Unit Tests', () => {
  let server: SocketIOLikeServer;
  let mockWss: jest.Mocked<WebSocketServer>;

  beforeEach(() => {
    server = new SocketIOLikeServer();
    mockWss = new WebSocketServer({ port: 3000 }) as jest.Mocked<WebSocketServer>;
  });

  afterEach(() => {
    server.close();
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    test('should create server with default namespace', () => {
      expect(server).toBeInstanceOf(SocketIOLikeServer);
      expect(server).toBeInstanceOf(EventEmitter);
      
      const stats = server.getStats();
      expect(stats.totalNamespaces).toBe(1);
      expect(stats.namespaces['/']).toBeDefined();
    });

    test('should listen on specified port', () => {
      const callback = jest.fn();
      server.listen(3000, callback);
      
      expect(callback).toHaveBeenCalled();
    });

    test('should attach to existing server', () => {
      const mockHttpServer = {};
      const callback = jest.fn();
      
      server.attach(mockHttpServer, callback);
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('User Management', () => {
    let mockSocket: SocketIOLikeSocket;
    let mockWs: jest.Mocked<WebSocket>;

    beforeEach(() => {
      mockWs = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>;
      const mockRequest = { url: '/' };
      mockSocket = new SocketIOLikeSocket(mockWs, mockRequest, server, server.of('/'));
    });

    test('should register user', () => {
      server.registerUser(mockSocket);
      
      const stats = server.getStats();
      expect(stats.totalUsers).toBe(1);
      expect(stats.users[0].id).toBe(mockSocket.id);
    });

    test('should unregister user', () => {
      server.registerUser(mockSocket);
      expect(server.getStats().totalUsers).toBe(1);
      
      server.unregisterUser(mockSocket.id);
      expect(server.getStats().totalUsers).toBe(0);
    });

    test('should get user by ID', () => {
      server.registerUser(mockSocket);
      
      const user = server.getUser(mockSocket.id);
      expect(user).toBeDefined();
      expect(user!.id).toBe(mockSocket.id);
      expect(user!.socket).toBe(mockSocket);
    });

    test('should return undefined for non-existent user', () => {
      const user = server.getUser('non-existent');
      expect(user).toBeUndefined();
    });
  });

  describe('Room Management', () => {
    let mockSocket: SocketIOLikeSocket;

    beforeEach(() => {
      const mockWs = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>;
      const mockRequest = { url: '/' };
      mockSocket = new SocketIOLikeSocket(mockWs, mockRequest, server, server.of('/'));
      server.registerUser(mockSocket);
    });

    test('should add user to room', () => {
      server.addToRoom('room1', mockSocket.id);
      
      const stats = server.getStats();
      expect(stats.totalRooms).toBe(1);
      expect(stats.rooms.room1).toBe(1);
      expect(stats.roomsWithMetadata.room1).toBeDefined();
      expect(stats.roomsWithMetadata.room1.userCount).toBe(1);
    });

    test('should remove user from room', () => {
      server.addToRoom('room1', mockSocket.id);
      expect(server.getStats().totalRooms).toBe(1);
      
      server.removeFromRoom('room1', mockSocket.id);
      expect(server.getStats().totalRooms).toBe(0);
    });

    test('should handle multiple users in same room', () => {
      const mockWs2 = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>;
      const mockRequest2 = { url: '/' };
      const mockSocket2 = new SocketIOLikeSocket(mockWs2, mockRequest2, server, server.of('/'));
      server.registerUser(mockSocket2);
      
      server.addToRoom('room1', mockSocket.id);
      server.addToRoom('room1', mockSocket2.id);
      
      const stats = server.getStats();
      expect(stats.rooms.room1).toBe(2);
      expect(stats.roomsWithMetadata.room1.userCount).toBe(2);
    });

    test('should get users in room', () => {
      server.addToRoom('room1', mockSocket.id);
      
      const users = server.getUsersInRoom('room1');
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(mockSocket.id);
    });

    test('should return empty array for non-existent room', () => {
      const users = server.getUsersInRoom('non-existent');
      expect(users).toHaveLength(0);
    });

    test('should check if room exists', () => {
      expect(server.hasRoom('room1')).toBe(false);
      
      server.addToRoom('room1', mockSocket.id);
      expect(server.hasRoom('room1')).toBe(true);
    });

    test('should get room user count', () => {
      expect(server.getRoomUserCount('room1')).toBe(0);
      
      server.addToRoom('room1', mockSocket.id);
      expect(server.getRoomUserCount('room1')).toBe(1);
    });

    test('should manage room metadata', () => {
      server.addToRoom('room1', mockSocket.id);
      
      const metadata = { description: 'Test room', maxUsers: 10 };
      server.setRoomMetadata('room1', metadata);
      
      const roomMeta = server.getRoomMetadata('room1');
      expect(roomMeta).toBeDefined();
      expect(roomMeta!.metadata.description).toBe('Test room');
      expect(roomMeta!.metadata.maxUsers).toBe(10);
    });

    test('should get all rooms', () => {
      server.addToRoom('room1', mockSocket.id);
      server.addToRoom('room2', mockSocket.id);
      
      const allRooms = server.getAllRooms();
      expect(allRooms).toHaveLength(2);
      expect(allRooms.map(r => r.name)).toContain('room1');
      expect(allRooms.map(r => r.name)).toContain('room2');
    });
  });

  describe('Broadcasting', () => {
    test('should have broadcast methods', () => {
      expect(typeof server.broadcastToAll).toBe('function');
      expect(typeof server.broadcastToRoom).toBe('function');
    });

    test('should broadcast to all users without errors', () => {
      expect(() => {
        server.broadcastToAll('test-event', ['data1', 'data2']);
      }).not.toThrow();
    });

    test('should broadcast to room without errors', () => {
      expect(() => {
        server.broadcastToRoom('room1', 'test-event', ['data']);
      }).not.toThrow();
    });

    test('should broadcast with exclusions without errors', () => {
      expect(() => {
        server.broadcastToAll('test-event', ['data'], 'excluded-id');
        server.broadcastToRoom('room1', 'test-event', ['data'], 'excluded-id');
      }).not.toThrow();
    });
  });

  describe('Broadcast Operators', () => {
    let mockSocket1: SocketIOLikeSocket;
    let mockSocket2: SocketIOLikeSocket;
    let mockSocket3: SocketIOLikeSocket;

    beforeEach(() => {
      const createMockSocket = () => {
        const mockWs = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>;
        const mockRequest = { url: '/' };
        const socket = new SocketIOLikeSocket(mockWs, mockRequest, server, server.of('/'));
        server.registerUser(socket);
        return socket;
      };

      mockSocket1 = createMockSocket();
      mockSocket2 = createMockSocket();
      mockSocket3 = createMockSocket();
    });

    test('should create broadcast operator with to()', () => {
      server.addToRoom('room1', mockSocket1.id);
      server.addToRoom('room1', mockSocket2.id);
      
      const broadcastOp = server.to('room1');
      expect(broadcastOp).toBeDefined();
      expect(typeof broadcastOp.emit).toBe('function');
    });

    test('should create broadcast operator with in()', () => {
      server.addToRoom('room1', mockSocket1.id);
      
      const broadcastOp = server.in('room1');
      expect(broadcastOp).toBeDefined();
      expect(typeof broadcastOp.emit).toBe('function');
    });

    test('should create broadcast operator with except()', () => {
      server.addToRoom('room1', mockSocket1.id);
      
      const broadcastOp = server.except('room1');
      expect(broadcastOp).toBeDefined();
      expect(typeof broadcastOp.emit).toBe('function');
    });

    test('should chain broadcast operators', () => {
      server.addToRoom('room1', mockSocket1.id);
      server.addToRoom('room2', mockSocket2.id);
      server.addToRoom('room3', mockSocket3.id);
      
      const broadcastOp = server.to('room1').to('room2').except('room3');
      expect(broadcastOp).toBeDefined();
      expect(typeof broadcastOp.emit).toBe('function');
    });
  });

  describe('Middleware Support', () => {
    test('should add connection middleware', () => {
      const middleware = jest.fn((socket, next) => next());
      server.use(middleware);
      
      const stats = server.getStats();
      expect(stats.serverMiddlewareCount).toBe(1);
    });

    test('should add event middleware', () => {
      const eventMiddleware = jest.fn((socket, event, data, next) => next());
      server.use(eventMiddleware);
      
      const stats = server.getStats();
      expect(stats.serverEventMiddlewareCount).toBe(1);
    });

    test('should distinguish between connection and event middleware', () => {
      const connectionMiddleware = jest.fn((socket, next) => next());
      const eventMiddleware = jest.fn((socket, event, data, next) => next());
      
      server.use(connectionMiddleware);
      server.use(eventMiddleware);
      
      const stats = server.getStats();
      expect(stats.serverMiddlewareCount).toBe(1);
      expect(stats.serverEventMiddlewareCount).toBe(1);
    });
  });

  describe('Namespace Management', () => {
    test('should create namespace', () => {
      const namespace = server.of('/chat');
      
      expect(namespace).toBeDefined();
      expect(namespace.name).toBe('/chat');
      
      const stats = server.getStats();
      expect(stats.totalNamespaces).toBe(2); // default + chat
      expect(stats.namespaces['/chat']).toBeDefined();
    });

    test('should return existing namespace', () => {
      const namespace1 = server.of('/chat');
      const namespace2 = server.of('/chat');
      
      expect(namespace1).toBe(namespace2);
      
      const stats = server.getStats();
      expect(stats.totalNamespaces).toBe(2); // Should not create duplicate
    });
  });

  describe('Event Handling', () => {
    test('should handle server events with emitter', () => {
      const callback = jest.fn();
      server.on('test-event', callback);
      
      server.emit('test-event', 'data');
      
      expect(callback).toHaveBeenCalledWith('data');
    });

    test('should handle once events', () => {
      const callback = jest.fn();
      server.once('test-event', callback);
      
      server.emit('test-event', 'data1');
      server.emit('test-event', 'data2');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('data1');
    });

    test('should remove event listeners', () => {
      const callback = jest.fn();
      server.on('test-event', callback);
      
      server.off('test-event', callback);
      server.emit('test-event', 'data');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Server Statistics', () => {
    test('should provide comprehensive stats', () => {
      const mockWs = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>;
      const mockRequest = { url: '/' };
      const mockSocket = new SocketIOLikeSocket(mockWs, mockRequest, server, server.of('/'));
      
      server.registerUser(mockSocket);
      server.addToRoom('room1', mockSocket.id);
      server.setRoomMetadata('room1', { description: 'Test room' });
      
      const connectionMiddleware = jest.fn((socket, next) => next());
      const eventMiddleware = jest.fn((socket, event, data, next) => next());
      server.use(connectionMiddleware);
      server.use(eventMiddleware);
      
      const stats = server.getStats();
      
      expect(stats.totalUsers).toBe(1);
      expect(stats.totalRooms).toBe(1);
      expect(stats.totalNamespaces).toBe(1);
      expect(stats.serverMiddlewareCount).toBe(1);
      expect(stats.serverEventMiddlewareCount).toBe(1);
      
      expect(stats.users).toHaveLength(1);
      expect(stats.users[0].id).toBe(mockSocket.id);
      expect(stats.users[0].rooms).toContain('room1');
      
      expect(stats.rooms.room1).toBe(1);
      expect(stats.roomsWithMetadata.room1.userCount).toBe(1);
      expect(stats.roomsWithMetadata.room1.metadata.description).toBe('Test room');
      
      expect(stats.namespaces['/']).toBeDefined();
    });
  });

  describe('Server Cleanup', () => {
    test('should close server and cleanup resources', () => {
      const mockWs = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>;
      const mockRequest = { url: '/' };
      const mockSocket = new SocketIOLikeSocket(mockWs, mockRequest, server, server.of('/'));
      
      server.registerUser(mockSocket);
      server.addToRoom('room1', mockSocket.id);
      
      const callback = jest.fn();
      server.close(callback);
      
      const stats = server.getStats();
      expect(stats.totalUsers).toBe(0);
      expect(stats.totalRooms).toBe(0);
      expect(stats.totalNamespaces).toBe(1); // Default namespace recreated
      
      expect(callback).toHaveBeenCalled();
    });
  });
});