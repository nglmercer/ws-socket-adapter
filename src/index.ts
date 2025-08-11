// Main exports for the ws-socketio-adapter library
export { Emitter } from './Emitter.js';
export { SocketIOLikeClient } from './client/ws-adapter.js';
export { SocketIOLikeServer, SocketIOLikeSocket, wsio, Namespace } from './server/SocketIOLikeAdapter.js';
export * from './logger/index.js';
// Re-export subpath entrypoints for convenience
export * as client from './client.js';
export * as server from './server.js';

// Type exports - Legacy interfaces
export type { User, Room, CustomSocket, ISocket } from './types.js';

// Type exports - Enhanced Socket.IO compatible interfaces
export type {
  // Generic event interfaces
  EventMap,
  TypedEventEmitter,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,

  // Connection and error types
  ConnectionState,
  TransportType,
  ErrorType,
  DisconnectReason,
  SocketIOError,
  DisconnectDetails,

  // Callback types
  AckCallback,
  EventCallback,
  AnyEventCallback,

  // Options
  ClientOptions,
  ExtendedClientOptions,
  ServerOptions,
  ExtendedServerOptions,

  // Middleware types
  ServerMiddleware,
  NamespaceMiddleware,
  EventMiddleware,

  // Socket interfaces
  SocketIOSocket,
  SocketIOClient,
  BroadcastOperator,

  // Enhanced types
  ConnectionStateUnion,
  ErrorTypeUnion,
  DisconnectReasonUnion,
  TransportTypeUnion,
  EnhancedSocketIOError,
  ConnectionError,
  CallbackError,
  MessageError,
  AuthError,
  EnhancedServerMiddleware,
  EnhancedNamespaceMiddleware,
  EnhancedEventMiddleware,
  EnhancedAckCallback,
  EnhancedEventCallback,
  EnhancedAnyEventCallback,
  EnhancedConnectionState,
  EnhancedServerState,
  NamespaceState,
  RoomState
} from './types.js';