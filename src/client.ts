// Client-side exports only - Safe for browser bundles
export { SocketIOLikeClient } from './client/ws-adapter.js';
export { Emitter } from './Emitter.js';

// Client-only types (safe for browser)
export type {
  // Generic event interfaces
  EventMap,
  TypedEventEmitter,
  ServerToClientEvents,
  ClientToServerEvents,
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

  // Client-specific options
  ClientOptions,
  ExtendedClientOptions,

  // Socket interfaces (client-side)
  SocketIOClient,

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
  EnhancedAckCallback,
  EnhancedEventCallback,
  EnhancedAnyEventCallback,
  EnhancedConnectionState,
} from './types.js';

// Legacy client interfaces
export type { User, CustomSocket } from './types.js';

// Re-export for compatibility
export { io } from './client/ws-adapter.js';
export type { Socket } from './client/ws-adapter.js';