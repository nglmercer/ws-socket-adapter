import type { ParsedUrlQuery } from 'querystring';

// ============================================================================
// GENERIC EVENT INTERFACES FOR TYPE-SAFE EVENT HANDLING
// ============================================================================

/**
 * Generic event map interface for type-safe event handling
 */
interface EventMap {
  [event: string]: (...args: any[]) => void;
}

/**
 * Generic typed event emitter interface
 */
interface TypedEventEmitter<T extends EventMap> {
  on<K extends keyof T>(event: K, listener: T[K]): this;
  once<K extends keyof T>(event: K, listener: T[K]): this;
  off<K extends keyof T>(event: K, listener?: T[K]): this;
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean;
  removeAllListeners<K extends keyof T>(event?: K): this;
  listenerCount<K extends keyof T>(event: K): number;
  listeners<K extends keyof T>(event: K): T[K][];
}

/**
 * Socket.IO compatible event interfaces
 */
interface ServerToClientEvents extends EventMap {
  connect: () => void;
  disconnect: (reason: string, details?: any) => void;
  error: (error: Error) => void;
  [event: string]: (...args: any[]) => void;
}

interface ClientToServerEvents extends EventMap {
  [event: string]: (...args: any[]) => void;
}

interface InterServerEvents extends EventMap {
  [event: string]: (...args: any[]) => void;
}

interface SocketData {
  [key: string]: any;
}

// ============================================================================
// SOCKET.IO COMPATIBLE TYPE DEFINITIONS
// ============================================================================

/**
 * Connection states
 */
type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected';

/**
 * Transport types
 */
type TransportType = 'websocket' | 'polling';

/**
 * Error types
 */
type ErrorType =
  | 'TransportError'
  | 'CallbackError'
  | 'MessageError'
  | 'ReconnectionError';

/**
 * Disconnect reasons
 */
type DisconnectReason =
  | 'transport close'
  | 'transport error'
  | 'server disconnect'
  | 'client disconnect'
  | 'ping timeout'
  | 'parse error'
  | 'forced close'
  | 'Normal closure'
  | 'Going away'
  | 'Protocol error'
  | 'Unsupported data'
  | 'No status received'
  | 'Abnormal closure'
  | 'Invalid frame payload data'
  | 'Policy violation'
  | 'Message too big'
  | 'Mandatory extension'
  | 'Internal server error'
  | 'TLS handshake failure';

/**
 * Enhanced error interface with Socket.IO compatibility
 */
interface SocketIOError extends Error {
  code?: string;
  type?: ErrorType;
  description?: string;
  context?: any;
  timestamp?: number;
}

/**
 * Connection details for disconnect events
 */
interface DisconnectDetails {
  wasClean: boolean;
  code: number;
  reason: string;
  timestamp: number;
  attempt?: number;
}

/**
 * Callback acknowledgment function type
 */
type AckCallback = (...args: any[]) => void;

/**
 * Event callback with acknowledgment support
 */
type EventCallback = (...args: any[]) => void;

/**
 * Any event callback for onAny/offAny
 */
type AnyEventCallback = (event: string, ...args: any[]) => void;

// ============================================================================
// CLIENT OPTIONS AND CONFIGURATION
// ============================================================================

/**
 * Client connection options (Socket.IO compatible)
 */
interface ClientOptions {
  /**
   * Whether to auto-connect on instantiation
   * @default true
   */
  autoConnect?: boolean;

  /**
   * Whether to enable reconnection
   * @default true
   */
  reconnection?: boolean;

  /**
   * Number of reconnection attempts before giving up
   * @default 5
   */
  reconnectionAttempts?: number;

  /**
   * Initial delay before reconnection in milliseconds
   * @default 1000
   */
  reconnectionDelay?: number;

  /**
   * Maximum delay between reconnections in milliseconds
   * @default 5000
   */
  reconnectionDelayMax?: number;

  /**
   * Randomization factor for reconnection delay
   * @default 0.5
   */
  randomizationFactor?: number;

  /**
   * Connection timeout in milliseconds
   * @default 20000
   */
  timeout?: number;

  /**
   * Whether to force a new connection
   * @default false
   */
  forceNew?: boolean;

  /**
   * Whether to enable multiplexing
   * @default true
   */
  multiplex?: boolean;

  /**
   * Query parameters to send with connection
   */
  query?: Record<string, string>;

  /**
   * Authentication data
   */
  auth?: Record<string, any> | ((callback: (data: any) => void) => void);

  /**
   * List of transports to try
   * @default ['websocket']
   */
  transports?: TransportType[];

  /**
   * Whether to upgrade the transport
   * @default true
   */
  upgrade?: boolean;

  /**
   * Whether to remember the transport
   * @default false
   */
  rememberUpgrade?: boolean;
}

/**
 * Extended client options with additional WebSocket-specific settings
 */
interface ExtendedClientOptions extends ClientOptions {
  /**
   * WebSocket protocols
   */
  protocols?: string | string[];

  /**
   * Custom headers for WebSocket connection
   */
  headers?: Record<string, string>;

  /**
   * Whether to enable compression
   * @default false
   */
  compression?: boolean;

  /**
   * Maximum payload size in bytes
   */
  maxPayload?: number;

  /**
   * Ping interval in milliseconds
   */
  pingInterval?: number;

  /**
   * Pong timeout in milliseconds
   */
  pongTimeout?: number;
}

// ============================================================================
// SERVER OPTIONS AND CONFIGURATION
// ============================================================================

/**
 * Server options (Socket.IO compatible)
 */
interface ServerOptions {
  /**
   * Server path
   * @default '/socket.io/'
   */
  path?: string;

  /**
   * Whether to serve client files
   * @default true
   */
  serveClient?: boolean;

  /**
   * Allowed origins
   */
  cors?: {
    origin?: string | string[] | boolean;
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };

  /**
   * Connection state recovery options
   */
  connectionStateRecovery?: {
    maxDisconnectionDuration?: number;
    skipMiddlewares?: boolean;
  };

  /**
   * Whether to enable compression
   * @default false
   */
  compression?: boolean;

  /**
   * Ping timeout in milliseconds
   * @default 60000
   */
  pingTimeout?: number;

  /**
   * Ping interval in milliseconds
   * @default 25000
   */
  pingInterval?: number;

  /**
   * Maximum HTTP buffer size
   */
  maxHttpBufferSize?: number;

  /**
   * Whether to allow EIO3
   * @default false
   */
  allowEIO3?: boolean;

  /**
   * List of allowed transports
   */
  transports?: TransportType[];
}

/**
 * Extended server options with WebSocket-specific settings
 */
interface ExtendedServerOptions extends ServerOptions {
  /**
   * WebSocket server port
   */
  port?: number;

  /**
   * WebSocket server host
   */
  host?: string;

  /**
   * Maximum connections
   */
  maxConnections?: number;

  /**
   * Connection timeout in milliseconds
   */
  connectionTimeout?: number;

  /**
   * Whether to enable per-message deflate
   */
  perMessageDeflate?: boolean;

  /**
   * Custom WebSocket server options
   */
  wsOptions?: any;
}

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

/**
 * Middleware function type for server
 */
type ServerMiddleware<T = any> = (
  socket: SocketIOSocket<
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    T
  >,
  next: (err?: Error) => void
) => void;

/**
 * Middleware function type for namespace
 */
type NamespaceMiddleware<T = any> = (
  socket: SocketIOSocket<
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    T
  >,
  next: (err?: Error) => void
) => void;

/**
 * Event middleware function type
 */
type EventMiddleware = (
  event: string,
  args: any[],
  next: (err?: Error) => void
) => void;

// ============================================================================
// SOCKET INTERFACES
// ============================================================================

/**
 * Generic Socket.IO compatible socket interface
 */
interface SocketIOSocket<
  ServerToClientEvents extends EventMap = any,
  ClientToServerEvents extends EventMap = any,
  InterServerEvents extends EventMap = any,
  SocketData = any,
> extends TypedEventEmitter<ServerToClientEvents> {
  /**
   * Unique socket identifier
   */
  readonly id: string;

  /**
   * Whether the socket is connected
   */
  readonly connected: boolean;

  /**
   * Whether the socket is disconnected
   */
  readonly disconnected: boolean;

  /**
   * Handshake information
   */
  readonly handshake: {
    query: ParsedUrlQuery;
    headers: Record<string, string>;
    auth: any;
    time: string;
    issued: number;
    url: string;
    address: string;
    xdomain: boolean;
    secure: boolean;
  };

  /**
   * Connection information
   */
  readonly conn: {
    transport: {
      name: TransportType;
    };
  };

  /**
   * Socket data
   */
  data: SocketData;

  /**
   * Rooms the socket has joined
   */
  readonly rooms: Set<string>;

  /**
   * Broadcast operator
   */
  readonly broadcast: BroadcastOperator<ServerToClientEvents>;

  /**
   * Emit an event to the client
   */
  emit<K extends keyof ServerToClientEvents>(
    event: K,
    ...args: Parameters<ServerToClientEvents[K]>
  ): boolean;

  /**
   * Emit an event with acknowledgment
   */
  emitWithAck<K extends keyof ServerToClientEvents>(
    event: K,
    ...args: Parameters<ServerToClientEvents[K]>
  ): Promise<any>;

  /**
   * Join a room
   */
  join(room: string | string[]): Promise<void> | void;

  /**
   * Leave a room
   */
  leave(room: string): Promise<void> | void;

  /**
   * Disconnect the socket
   */
  disconnect(close?: boolean): this;

  /**
   * Send a message (alias for emit)
   */
  send(...args: any[]): this;

  /**
   * Enable compression for the next packet
   */
  compress(compress: boolean): this;

  /**
   * Set timeout for the next packet
   */
  timeout(timeout: number): this;

  /**
   * Get broadcast operator for specific room
   */
  to(room: string | string[]): BroadcastOperator<ServerToClientEvents>;

  /**
   * Get broadcast operator for specific room (alias for to)
   */
  in(room: string | string[]): BroadcastOperator<ServerToClientEvents>;
}

/**
 * Client socket interface (Socket.IO compatible)
 */
interface SocketIOClient<
  ServerToClientEvents extends EventMap = any,
  ClientToServerEvents extends EventMap = any,
> {
  /**
   * Unique socket identifier
   */
  readonly id: string;

  /**
   * Whether the socket is connected
   */
  readonly connected: boolean;

  /**
   * Whether the socket is disconnected
   */
  readonly disconnected: boolean;

  /**
   * Connect to the server
   */
  connect(): this;

  /**
   * Disconnect from the server
   */
  disconnect(): this;

  /**
   * Listen for server events
   */
  on<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): this;
  once<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): this;
  off<K extends keyof ServerToClientEvents>(
    event: K,
    listener?: ServerToClientEvents[K]
  ): this;

  /**
   * Emit an event to the server
   */
  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): this;

  /**
   * Emit an event with acknowledgment callback
   */
  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: [...Parameters<ClientToServerEvents[K]>, AckCallback]
  ): this;

  /**
   * Listen for any event
   */
  onAny(callback: AnyEventCallback): this;

  /**
   * Remove any event listener
   */
  offAny(callback?: AnyEventCallback): this;

  /**
   * Send a message (alias for emit)
   */
  send(...args: any[]): this;

  /**
   * Enable compression for the next packet
   */
  compress(compress: boolean): this;

  /**
   * Set timeout for the next packet
   */
  timeout(timeout: number): this;
}

/**
 * Broadcast operator interface
 */
interface BroadcastOperator<T extends EventMap> {
  /**
   * Emit to all sockets in the operator scope
   */
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean;

  /**
   * Target specific room(s)
   */
  to(room: string | string[]): BroadcastOperator<T>;

  /**
   * Target specific room(s) (alias for to)
   */
  in(room: string | string[]): BroadcastOperator<T>;

  /**
   * Exclude specific room(s)
   */
  except(room: string | string[]): BroadcastOperator<T>;

  /**
   * Enable compression
   */
  compress(compress: boolean): BroadcastOperator<T>;

  /**
   * Set timeout
   */
  timeout(timeout: number): BroadcastOperator<T>;
}

// ============================================================================
// LEGACY INTERFACES (for backward compatibility)
// ============================================================================

/**
 * Legacy generic socket interface
 */
interface ISocket {
  id: string;
  handshake: {
    query: QueryParams;
     headers?: Record<string, string>;
     auth?: any;
     time?: string;
     issued?: number;
     url?: string;
     address?: string;
     xdomain?: boolean;
     secure?: boolean;
   };
  on(event: string, callback: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
  broadcast: {
    emit(event: string, ...args: any[]): void;
  };
  disconnect(close?: boolean): this;
  nsp?: any;
}

/**
 * Legacy user interface
 */
interface User {
  userid: string;
  socket: CustomSocket;
  connectedWith: { [key: string]: CustomSocket };
  extra: any;
  socketMessageEvent: string;
  socketCustomEvent: string;
  roomid?: string;
  connectedAt?: Date;
}

/**
 * Legacy room interface
 */
interface Room {
  maxParticipantsAllowed: number;
  owner: string;
  participants: string[];
  extra: any;
  socketMessageEvent: string;
  socketCustomEvent: string;
  identifier: string;
  session: {
    audio: boolean;
    video: boolean;
    oneway?: boolean;
    broadcast?: boolean;
    scalable?: boolean;
  };
  password?: string;
  createdAt?: Date;
  maxUsers?: number;
  users?: User[];
}

/**
 * Legacy custom socket interface
 */
interface CustomSocket extends ISocket {
  userid: string;
  admininfo?: {
    sessionid: string;
    session: any;
    mediaConstraints: any;
    sdpConstraints: any;
    streams: any;
    extra: any;
  };
  connected?: boolean;
  ondisconnect?: () => void;
}

// ============================================================================
// EXPORTS
// ============================================================================

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

  // Legacy interfaces
  ISocket,
  User,
  Room,
  CustomSocket,
};

// Re-export enhanced types for convenience
export {
  type ConnectionStateUnion,
  type ErrorTypeUnion,
  type DisconnectReasonUnion,
  type TransportTypeUnion,
  type EnhancedSocketIOError,
  type ConnectionError,
  type CallbackError,
  type MessageError,
  type AuthError,
  type EnhancedServerMiddleware,
  type EnhancedNamespaceMiddleware,
  type EnhancedEventMiddleware,
  type EnhancedAckCallback,
  type EnhancedEventCallback,
  type EnhancedAnyEventCallback,
  type EnhancedConnectionState,
  type EnhancedServerState,
  type NamespaceState,
  type RoomState,
} from './types/enhanced.js';

type QueryParams = Record<string, string | string[] | undefined>;
