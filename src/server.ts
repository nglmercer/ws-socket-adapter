// Server-side exports only - Node.js environment
export { SocketIOLikeServer, SocketIOLikeSocket, wsio, Namespace } from './server/SocketIOLikeAdapter.js';
export { Emitter } from './Emitter.js';

// Server-only logging utilities
export { logger, defaultLogger, log, ExtendedLogger } from './logger/index.js';

// Server-only types
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
  ServerOptions,
  ExtendedServerOptions,

  // Middleware types
  ServerMiddleware,
  NamespaceMiddleware,
  EventMiddleware,

  // Socket interfaces
  SocketIOSocket,
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
  RoomState,

  // Legacy
  User,
  Room,
  CustomSocket,
  ISocket,
} from './types.js';