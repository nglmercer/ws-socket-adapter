// LoggerFactory.ts - Factory for creating component-specific loggers
import { Logger } from './Logger.js';
import { getConfigForEnvironment, createCustomConfig } from './config.js';
/**
 * Component types for the Socket.IO adapter
 */
export var ComponentType;
(function (ComponentType) {
    ComponentType["CLIENT"] = "client";
    ComponentType["SERVER"] = "server";
    ComponentType["EMITTER"] = "emitter";
    ComponentType["NAMESPACE"] = "namespace";
    ComponentType["ROOM"] = "room";
    ComponentType["CONNECTION"] = "connection";
    ComponentType["MIDDLEWARE"] = "middleware";
    ComponentType["ADAPTER"] = "adapter";
    ComponentType["WEBSOCKET"] = "websocket";
})(ComponentType || (ComponentType = {}));
/**
 * Component-specific logger that adds context and formatting
 */
export class ComponentLogger extends Logger {
    constructor(componentType, config, globalPrefix = 'ws-socketio', componentId) {
        super(config);
        this.componentType = componentType;
        this.componentId = componentId;
        this.globalPrefix = globalPrefix;
    }
    /**
     * Create formatted event name with component context
     */
    formatEvent(event) {
        const parts = [this.globalPrefix, this.componentType];
        if (this.componentId) {
            parts.push(this.componentId);
        }
        parts.push(event);
        return parts.join(':');
    }
    /**
     * Add component context to log data
     */
    addComponentContext(context) {
        const componentContext = {
            component: this.componentType,
            ...(this.componentId && { componentId: this.componentId }),
            timestamp: Date.now(),
            ...context,
        };
        return componentContext;
    }
    // Override parent methods to add component context
    debug(event, message, data, context) {
        super.debug(this.formatEvent(event), { message, data, context: this.addComponentContext(context) });
    }
    info(event, message, data, context) {
        super.info(this.formatEvent(event), { message, data, context: this.addComponentContext(context) });
    }
    warn(event, message, data, context) {
        super.warn(this.formatEvent(event), { message, data, context: this.addComponentContext(context) });
    }
    error(event, message, data, context) {
        super.error(this.formatEvent(event), { message, data, context: this.addComponentContext(context) });
    }
    fatal(event, message, data, context) {
        super.fatal(this.formatEvent(event), { message, data, context: this.addComponentContext(context) });
    }
    /**
     * Performance logging for high-frequency operations
     */
    performance(event, duration, data, context) {
        this.debug(`performance:${event}`, `Operation completed in ${duration}ms`, data, { ...context, duration, performanceLog: true });
    }
    /**
     * Connection lifecycle logging
     */
    connection(event, socketId, data, context) {
        this.info(`connection:${event}`, `Connection ${event}`, data, { ...context, socketId, connectionEvent: true });
    }
    /**
     * Room operation logging
     */
    room(event, roomName, socketId, data, context) {
        this.debug(`room:${event}`, `Room operation: ${event}`, data, { ...context, roomName, socketId, roomEvent: true });
    }
    /**
     * Namespace operation logging
     */
    namespace(event, namespaceName, data, context) {
        this.debug(`namespace:${event}`, `Namespace operation: ${event}`, data, { ...context, namespaceName, namespaceEvent: true });
    }
}
/**
 * Logger factory for creating component-specific loggers
 */
export class LoggerFactory {
    constructor(config = {}) {
        this.loggers = new Map();
        this.config = {
            globalPrefix: 'ws-socketio',
            enableComponentPrefixes: true,
            ...config,
        };
        this.baseConfig = config.baseConfig || getConfigForEnvironment();
    }
    /**
     * Get or create a logger for a specific component
     */
    getLogger(componentType, componentId) {
        const key = componentId ? `${componentType}:${componentId}` : componentType;
        if (this.loggers.has(key)) {
            return this.loggers.get(key);
        }
        // Get component-specific config if available
        const componentConfig = this.config.componentConfigs?.[componentType];
        const finalConfig = componentConfig
            ? createCustomConfig(this.baseConfig, componentConfig)
            : this.baseConfig;
        const logger = new ComponentLogger(componentType, finalConfig, this.config.globalPrefix, componentId);
        this.loggers.set(key, logger);
        return logger;
    }
    /**
     * Create a client logger
     */
    createClientLogger(clientId) {
        return this.getLogger(ComponentType.CLIENT, clientId);
    }
    /**
     * Create a server logger
     */
    createServerLogger(serverId) {
        return this.getLogger(ComponentType.SERVER, serverId);
    }
    /**
     * Create an emitter logger
     */
    createEmitterLogger(emitterId) {
        return this.getLogger(ComponentType.EMITTER, emitterId);
    }
    /**
     * Create a namespace logger
     */
    createNamespaceLogger(namespaceName) {
        return this.getLogger(ComponentType.NAMESPACE, namespaceName);
    }
    /**
     * Create a room logger
     */
    createRoomLogger(roomName) {
        return this.getLogger(ComponentType.ROOM, roomName);
    }
    /**
     * Create a connection logger
     */
    createConnectionLogger(connectionId) {
        return this.getLogger(ComponentType.CONNECTION, connectionId);
    }
    /**
     * Create a middleware logger
     */
    createMiddlewareLogger(middlewareName) {
        return this.getLogger(ComponentType.MIDDLEWARE, middlewareName);
    }
    /**
     * Create an adapter logger
     */
    createAdapterLogger(adapterId) {
        return this.getLogger(ComponentType.ADAPTER, adapterId);
    }
    /**
     * Create a WebSocket logger
     */
    createWebSocketLogger(socketId) {
        return this.getLogger(ComponentType.WEBSOCKET, socketId);
    }
    /**
     * Update configuration for all loggers
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (newConfig.baseConfig) {
            this.baseConfig = newConfig.baseConfig;
        }
        // Update existing loggers with new config
        this.loggers.forEach((logger, key) => {
            const [componentType] = key.split(':');
            const componentConfig = this.config.componentConfigs?.[componentType];
            const finalConfig = componentConfig
                ? createCustomConfig(this.baseConfig, componentConfig)
                : this.baseConfig;
            logger.updateConfig(finalConfig);
        });
    }
    /**
     * Get all active loggers
     */
    getActiveLoggers() {
        return new Map(this.loggers);
    }
    /**
     * Clear all loggers
     */
    clearLoggers() {
        this.loggers.forEach(logger => logger.close());
        this.loggers.clear();
    }
    /**
     * Get factory statistics
     */
    getStats() {
        return {
            activeLoggers: this.loggers.size,
            loggerKeys: Array.from(this.loggers.keys()),
            config: this.config,
            baseConfig: this.baseConfig,
        };
    }
}
// Global factory instance
let globalFactory = null;
/**
 * Get or create the global logger factory
 */
export function getLoggerFactory(config) {
    if (!globalFactory) {
        globalFactory = new LoggerFactory(config);
    }
    else if (config) {
        globalFactory.updateConfig(config);
    }
    return globalFactory;
}
/**
 * Convenience functions for creating component loggers
 */
export const createLogger = {
    client: (clientId) => getLoggerFactory().createClientLogger(clientId),
    server: (serverId) => getLoggerFactory().createServerLogger(serverId),
    emitter: (emitterId) => getLoggerFactory().createEmitterLogger(emitterId),
    namespace: (namespaceName) => getLoggerFactory().createNamespaceLogger(namespaceName),
    room: (roomName) => getLoggerFactory().createRoomLogger(roomName),
    connection: (connectionId) => getLoggerFactory().createConnectionLogger(connectionId),
    middleware: (middlewareName) => getLoggerFactory().createMiddlewareLogger(middlewareName),
    adapter: (adapterId) => getLoggerFactory().createAdapterLogger(adapterId),
    websocket: (socketId) => getLoggerFactory().createWebSocketLogger(socketId),
};
export default LoggerFactory;
//# sourceMappingURL=LoggerFactory.js.map