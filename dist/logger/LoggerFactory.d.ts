import { Logger, type LoggerConfig } from './Logger.js';
/**
 * Component types for the Socket.IO adapter
 */
export declare enum ComponentType {
    CLIENT = "client",
    SERVER = "server",
    EMITTER = "emitter",
    NAMESPACE = "namespace",
    ROOM = "room",
    CONNECTION = "connection",
    MIDDLEWARE = "middleware",
    ADAPTER = "adapter",
    WEBSOCKET = "websocket"
}
/**
 * Logger factory configuration
 */
export interface LoggerFactoryConfig {
    baseConfig?: LoggerConfig;
    componentConfigs?: Partial<Record<ComponentType, Partial<LoggerConfig>>>;
    globalPrefix?: string;
    enableComponentPrefixes?: boolean;
}
/**
 * Component-specific logger that adds context and formatting
 */
export declare class ComponentLogger extends Logger {
    private componentType;
    private componentId?;
    private globalPrefix;
    constructor(componentType: ComponentType, config: LoggerConfig, globalPrefix?: string, componentId?: string);
    /**
     * Create formatted event name with component context
     */
    private formatEvent;
    /**
     * Add component context to log data
     */
    private addComponentContext;
    debug(event: string, message: any, data?: any, context?: Record<string, any>): void;
    info(event: string, message: any, data?: any, context?: Record<string, any>): void;
    warn(event: string, message: any, data?: any, context?: Record<string, any>): void;
    error(event: string, message: any, data?: any, context?: Record<string, any>): void;
    fatal(event: string, message: any, data?: any, context?: Record<string, any>): void;
    /**
     * Performance logging for high-frequency operations
     */
    performance(event: string, duration: number, data?: any, context?: Record<string, any>): void;
    /**
     * Connection lifecycle logging
     */
    connection(event: string, socketId?: string, data?: any, context?: Record<string, any>): void;
    /**
     * Room operation logging
     */
    room(event: string, roomName: string, socketId?: string, data?: any, context?: Record<string, any>): void;
    /**
     * Namespace operation logging
     */
    namespace(event: string, namespaceName: string, data?: any, context?: Record<string, any>): void;
}
/**
 * Logger factory for creating component-specific loggers
 */
export declare class LoggerFactory {
    private config;
    private loggers;
    private baseConfig;
    constructor(config?: LoggerFactoryConfig);
    /**
     * Get or create a logger for a specific component
     */
    getLogger(componentType: ComponentType, componentId?: string): ComponentLogger;
    /**
     * Create a client logger
     */
    createClientLogger(clientId?: string): ComponentLogger;
    /**
     * Create a server logger
     */
    createServerLogger(serverId?: string): ComponentLogger;
    /**
     * Create an emitter logger
     */
    createEmitterLogger(emitterId?: string): ComponentLogger;
    /**
     * Create a namespace logger
     */
    createNamespaceLogger(namespaceName: string): ComponentLogger;
    /**
     * Create a room logger
     */
    createRoomLogger(roomName: string): ComponentLogger;
    /**
     * Create a connection logger
     */
    createConnectionLogger(connectionId: string): ComponentLogger;
    /**
     * Create a middleware logger
     */
    createMiddlewareLogger(middlewareName?: string): ComponentLogger;
    /**
     * Create an adapter logger
     */
    createAdapterLogger(adapterId?: string): ComponentLogger;
    /**
     * Create a WebSocket logger
     */
    createWebSocketLogger(socketId?: string): ComponentLogger;
    /**
     * Update configuration for all loggers
     */
    updateConfig(newConfig: Partial<LoggerFactoryConfig>): void;
    /**
     * Get all active loggers
     */
    getActiveLoggers(): Map<string, ComponentLogger>;
    /**
     * Clear all loggers
     */
    clearLoggers(): void;
    /**
     * Get factory statistics
     */
    getStats(): Record<string, any>;
}
/**
 * Get or create the global logger factory
 */
export declare function getLoggerFactory(config?: LoggerFactoryConfig): LoggerFactory;
/**
 * Convenience functions for creating component loggers
 */
export declare const createLogger: {
    client: (clientId?: string) => ComponentLogger;
    server: (serverId?: string) => ComponentLogger;
    emitter: (emitterId?: string) => ComponentLogger;
    namespace: (namespaceName: string) => ComponentLogger;
    room: (roomName: string) => ComponentLogger;
    connection: (connectionId: string) => ComponentLogger;
    middleware: (middlewareName?: string) => ComponentLogger;
    adapter: (adapterId?: string) => ComponentLogger;
    websocket: (socketId?: string) => ComponentLogger;
};
export default LoggerFactory;
//# sourceMappingURL=LoggerFactory.d.ts.map