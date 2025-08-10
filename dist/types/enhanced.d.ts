import { ServerMiddleware, NamespaceMiddleware, EventMiddleware } from '../types.js';
/**
 * Union type for all possible connection states
 */
export type ConnectionStateUnion = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'reconnecting' | 'error';
/**
 * Union type for all possible error types
 */
export type ErrorTypeUnion = 'TransportError' | 'CallbackError' | 'MessageError' | 'ReconnectionError' | 'AuthenticationError' | 'ValidationError' | 'TimeoutError' | 'NetworkError' | 'ProtocolError' | 'ServerError' | 'ClientError';
/**
 * Union type for all possible disconnect reasons
 */
export type DisconnectReasonUnion = 'transport close' | 'transport error' | 'server disconnect' | 'client disconnect' | 'ping timeout' | 'parse error' | 'forced close' | 'Normal closure' | 'Going away' | 'Protocol error' | 'Unsupported data' | 'No status received' | 'Abnormal closure' | 'Invalid frame payload data' | 'Policy violation' | 'Message too big' | 'Mandatory extension' | 'Internal server error' | 'TLS handshake failure' | 'authentication failed' | 'authorization failed' | 'rate limit exceeded' | 'server shutdown' | 'namespace not found';
/**
 * Union type for transport types
 */
export type TransportTypeUnion = 'websocket' | 'polling' | 'webtransport';
/**
 * Enhanced error interface with detailed context
 */
export interface EnhancedSocketIOError extends Error {
    code: string;
    type: ErrorTypeUnion;
    description: string;
    context: {
        socketId?: string;
        namespace?: string;
        room?: string;
        event?: string;
        transport?: TransportTypeUnion;
        connectionState?: ConnectionStateUnion;
        attempt?: number;
        maxAttempts?: number;
        duration?: number;
        url?: string;
        headers?: Record<string, string>;
        query?: Record<string, any>;
        auth?: any;
    };
    timestamp: number;
    stack?: string;
    cause?: Error;
}
/**
 * Connection error with specific details
 */
export interface ConnectionError extends EnhancedSocketIOError {
    type: 'TransportError' | 'NetworkError' | 'TimeoutError';
    context: {
        socketId: string;
        transport: TransportTypeUnion;
        connectionState: ConnectionStateUnion;
        url: string;
        attempt: number;
        maxAttempts: number;
        duration: number;
    };
}
/**
 * Callback error with execution details
 */
export interface CallbackError extends EnhancedSocketIOError {
    type: 'CallbackError' | 'TimeoutError';
    context: {
        socketId: string;
        event: string;
        callbackId: string;
        timeout: number;
        elapsedTime: number;
        retries: number;
    };
}
/**
 * Message parsing error
 */
export interface MessageError extends EnhancedSocketIOError {
    type: 'MessageError' | 'ProtocolError' | 'ValidationError';
    context: {
        socketId: string;
        rawMessage: string;
        expectedFormat: string;
        actualFormat: string;
        parseAttempt: number;
    };
}
/**
 * Authentication/Authorization error
 */
export interface AuthError extends EnhancedSocketIOError {
    type: 'AuthenticationError';
    context: {
        socketId: string;
        namespace: string;
        auth: any;
        reason: 'invalid_credentials' | 'expired_token' | 'insufficient_permissions' | 'rate_limited';
    };
}
/**
 * Enhanced server middleware with typed context
 */
export interface EnhancedServerMiddleware<T = any> extends ServerMiddleware<T> {
    name?: string;
    priority?: number;
    enabled?: boolean;
    conditions?: {
        namespace?: string | RegExp;
        transport?: TransportTypeUnion[];
        auth?: boolean;
        rooms?: string[];
    };
}
/**
 * Enhanced namespace middleware with typed context
 */
export interface EnhancedNamespaceMiddleware<T = any> extends NamespaceMiddleware<T> {
    name?: string;
    priority?: number;
    enabled?: boolean;
    conditions?: {
        events?: string[] | RegExp;
        rooms?: string[];
        auth?: boolean;
    };
}
/**
 * Enhanced event middleware with validation
 */
export interface EnhancedEventMiddleware extends EventMiddleware {
    name?: string;
    priority?: number;
    enabled?: boolean;
    validation?: {
        schema?: any;
        required?: string[];
        maxLength?: number;
        allowedTypes?: string[];
    };
    rateLimit?: {
        maxRequests: number;
        windowMs: number;
        skipSuccessfulRequests?: boolean;
    };
}
/**
 * Enhanced acknowledgment callback with error handling
 */
export type EnhancedAckCallback = (error?: EnhancedSocketIOError | null, ...args: any[]) => void;
/**
 * Event callback with error context
 */
export type EnhancedEventCallback = (...args: any[]) => void | Promise<void>;
/**
 * Any event callback with enhanced metadata
 */
export type EnhancedAnyEventCallback = (event: string, metadata: {
    socketId: string;
    namespace: string;
    timestamp: number;
    transport: TransportTypeUnion;
    rooms: string[];
}, ...args: any[]) => void;
/**
 * Enhanced connection state with detailed information
 */
export interface EnhancedConnectionState {
    id: string;
    status: ConnectionStateUnion;
    transport: TransportTypeUnion;
    namespace: string;
    rooms: Set<string>;
    connectedAt: number;
    lastActivity: number;
    lastPing: number;
    lastPong: number;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    nextReconnectDelay: number;
    auth?: any;
    authenticated: boolean;
    stats: {
        messagesReceived: number;
        messagesSent: number;
        bytesReceived: number;
        bytesSent: number;
        errors: number;
        reconnections: number;
        averageLatency: number;
        lastLatency: number;
    };
    config: {
        compression: boolean;
        timeout: number;
        pingInterval: number;
        pongTimeout: number;
        maxPayload: number;
    };
}
/**
 * Server state with enhanced tracking
 */
export interface EnhancedServerState {
    connections: Map<string, EnhancedConnectionState>;
    namespaces: Map<string, NamespaceState>;
    rooms: Map<string, RoomState>;
    middleware: EnhancedServerMiddleware[];
    stats: {
        totalConnections: number;
        activeConnections: number;
        totalMessages: number;
        totalErrors: number;
        uptime: number;
        startTime: number;
        peakConnections: number;
        averageConnectionDuration: number;
    };
    config: {
        maxConnections: number;
        connectionTimeout: number;
        pingInterval: number;
        pongTimeout: number;
        compression: boolean;
        cors: any;
        transports: TransportTypeUnion[];
    };
}
/**
 * Namespace state with enhanced metadata
 */
export interface NamespaceState {
    name: string;
    sockets: Map<string, string>;
    rooms: Map<string, Set<string>>;
    middleware: EnhancedNamespaceMiddleware[];
    stats: {
        totalConnections: number;
        activeConnections: number;
        totalMessages: number;
        totalRooms: number;
        createdAt: number;
    };
    config: {
        requireAuth: boolean;
        maxConnections?: number;
        rateLimiting?: {
            maxMessages: number;
            windowMs: number;
        };
    };
}
/**
 * Room state with enhanced tracking
 */
export interface RoomState {
    name: string;
    namespace: string;
    users: Set<string>;
    createdAt: number;
    createdBy?: string;
    metadata: {
        isPrivate: boolean;
        maxUsers?: number;
        description?: string;
        tags: string[];
        owner?: string;
    };
    stats: {
        totalMessages: number;
        totalUsers: number;
        peakUsers: number;
        lastActivity: number;
        averageSessionDuration: number;
    };
    config: {
        allowAnonymous: boolean;
        requireAuth: boolean;
        messageHistory: boolean;
        maxMessageHistory: number;
        rateLimiting?: {
            maxMessages: number;
            windowMs: number;
        };
    };
}
//# sourceMappingURL=enhanced.d.ts.map