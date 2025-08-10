// LoggerFactory.ts - Factory for creating component-specific loggers

import { Logger, LogLevel, type LoggerConfig } from './Logger.js';
import { getConfigForEnvironment, createCustomConfig } from './config.js';

/**
 * Component types for the Socket.IO adapter
 */
export enum ComponentType {
  CLIENT = 'client',
  SERVER = 'server',
  EMITTER = 'emitter',
  NAMESPACE = 'namespace',
  ROOM = 'room',
  CONNECTION = 'connection',
  MIDDLEWARE = 'middleware',
  ADAPTER = 'adapter',
  WEBSOCKET = 'websocket',
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
export class ComponentLogger extends Logger {
  private componentType: ComponentType;
  private componentId?: string;
  private globalPrefix: string;

  constructor(
    componentType: ComponentType,
    config: LoggerConfig,
    globalPrefix: string = 'ws-socketio',
    componentId?: string
  ) {
    super(config);
    this.componentType = componentType;
    this.componentId = componentId;
    this.globalPrefix = globalPrefix;
  }

  /**
   * Create formatted event name with component context
   */
  private formatEvent(event: string): string {
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
  private addComponentContext(context?: Record<string, any>): Record<string, any> {
    const componentContext = {
      component: this.componentType,
      ...(this.componentId && { componentId: this.componentId }),
      timestamp: Date.now(),
      ...context,
    };

    return componentContext;
  }

  // Override parent methods to add component context
  debug(event: string, message: any, data?: any, context?: Record<string, any>): void {
    super.debug(
      this.formatEvent(event),
      { message, data, context: this.addComponentContext(context) }
    );
  }

  info(event: string, message: any, data?: any, context?: Record<string, any>): void {
    super.info(
      this.formatEvent(event),
      { message, data, context: this.addComponentContext(context) }
    );
  }

  warn(event: string, message: any, data?: any, context?: Record<string, any>): void {
    super.warn(
      this.formatEvent(event),
      { message, data, context: this.addComponentContext(context) }
    );
  }

  error(event: string, message: any, data?: any, context?: Record<string, any>): void {
    super.error(
      this.formatEvent(event),
      { message, data, context: this.addComponentContext(context) }
    );
  }

  fatal(event: string, message: any, data?: any, context?: Record<string, any>): void {
    super.fatal(
      this.formatEvent(event),
      { message, data, context: this.addComponentContext(context) }
    );
  }

  /**
   * Performance logging for high-frequency operations
   */
  performance(event: string, duration: number, data?: any, context?: Record<string, any>): void {
    this.debug(
      `performance:${event}`,
      `Operation completed in ${duration}ms`,
      data,
      { ...context, duration, performanceLog: true }
    );
  }

  /**
   * Connection lifecycle logging
   */
  connection(event: string, socketId?: string, data?: any, context?: Record<string, any>): void {
    this.info(
      `connection:${event}`,
      `Connection ${event}`,
      data,
      { ...context, socketId, connectionEvent: true }
    );
  }

  /**
   * Room operation logging
   */
  room(event: string, roomName: string, socketId?: string, data?: any, context?: Record<string, any>): void {
    this.debug(
      `room:${event}`,
      `Room operation: ${event}`,
      data,
      { ...context, roomName, socketId, roomEvent: true }
    );
  }

  /**
   * Namespace operation logging
   */
  namespace(event: string, namespaceName: string, data?: any, context?: Record<string, any>): void {
    this.debug(
      `namespace:${event}`,
      `Namespace operation: ${event}`,
      data,
      { ...context, namespaceName, namespaceEvent: true }
    );
  }
}

/**
 * Logger factory for creating component-specific loggers
 */
export class LoggerFactory {
  private config: LoggerFactoryConfig;
  private loggers: Map<string, ComponentLogger> = new Map();
  private baseConfig: LoggerConfig;

  constructor(config: LoggerFactoryConfig = {}) {
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
  getLogger(componentType: ComponentType, componentId?: string): ComponentLogger {
    const key = componentId ? `${componentType}:${componentId}` : componentType;
    
    if (this.loggers.has(key)) {
      return this.loggers.get(key)!;
    }

    // Get component-specific config if available
    const componentConfig = this.config.componentConfigs?.[componentType];
    const finalConfig = componentConfig 
      ? createCustomConfig(this.baseConfig, componentConfig)
      : this.baseConfig;

    const logger = new ComponentLogger(
      componentType,
      finalConfig,
      this.config.globalPrefix!,
      componentId
    );

    this.loggers.set(key, logger);
    return logger;
  }

  /**
   * Create a client logger
   */
  createClientLogger(clientId?: string): ComponentLogger {
    return this.getLogger(ComponentType.CLIENT, clientId);
  }

  /**
   * Create a server logger
   */
  createServerLogger(serverId?: string): ComponentLogger {
    return this.getLogger(ComponentType.SERVER, serverId);
  }

  /**
   * Create an emitter logger
   */
  createEmitterLogger(emitterId?: string): ComponentLogger {
    return this.getLogger(ComponentType.EMITTER, emitterId);
  }

  /**
   * Create a namespace logger
   */
  createNamespaceLogger(namespaceName: string): ComponentLogger {
    return this.getLogger(ComponentType.NAMESPACE, namespaceName);
  }

  /**
   * Create a room logger
   */
  createRoomLogger(roomName: string): ComponentLogger {
    return this.getLogger(ComponentType.ROOM, roomName);
  }

  /**
   * Create a connection logger
   */
  createConnectionLogger(connectionId: string): ComponentLogger {
    return this.getLogger(ComponentType.CONNECTION, connectionId);
  }

  /**
   * Create a middleware logger
   */
  createMiddlewareLogger(middlewareName?: string): ComponentLogger {
    return this.getLogger(ComponentType.MIDDLEWARE, middlewareName);
  }

  /**
   * Create an adapter logger
   */
  createAdapterLogger(adapterId?: string): ComponentLogger {
    return this.getLogger(ComponentType.ADAPTER, adapterId);
  }

  /**
   * Create a WebSocket logger
   */
  createWebSocketLogger(socketId?: string): ComponentLogger {
    return this.getLogger(ComponentType.WEBSOCKET, socketId);
  }

  /**
   * Update configuration for all loggers
   */
  updateConfig(newConfig: Partial<LoggerFactoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.baseConfig) {
      this.baseConfig = newConfig.baseConfig;
    }

    // Update existing loggers with new config
    this.loggers.forEach((logger, key) => {
      const [componentType] = key.split(':') as [ComponentType];
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
  getActiveLoggers(): Map<string, ComponentLogger> {
    return new Map(this.loggers);
  }

  /**
   * Clear all loggers
   */
  clearLoggers(): void {
    this.loggers.forEach(logger => logger.close());
    this.loggers.clear();
  }

  /**
   * Get factory statistics
   */
  getStats(): Record<string, any> {
    return {
      activeLoggers: this.loggers.size,
      loggerKeys: Array.from(this.loggers.keys()),
      config: this.config,
      baseConfig: this.baseConfig,
    };
  }
}

// Global factory instance
let globalFactory: LoggerFactory | null = null;

/**
 * Get or create the global logger factory
 */
export function getLoggerFactory(config?: LoggerFactoryConfig): LoggerFactory {
  if (!globalFactory) {
    globalFactory = new LoggerFactory(config);
  } else if (config) {
    globalFactory.updateConfig(config);
  }
  return globalFactory;
}

/**
 * Convenience functions for creating component loggers
 */
export const createLogger = {
  client: (clientId?: string) => getLoggerFactory().createClientLogger(clientId),
  server: (serverId?: string) => getLoggerFactory().createServerLogger(serverId),
  emitter: (emitterId?: string) => getLoggerFactory().createEmitterLogger(emitterId),
  namespace: (namespaceName: string) => getLoggerFactory().createNamespaceLogger(namespaceName),
  room: (roomName: string) => getLoggerFactory().createRoomLogger(roomName),
  connection: (connectionId: string) => getLoggerFactory().createConnectionLogger(connectionId),
  middleware: (middlewareName?: string) => getLoggerFactory().createMiddlewareLogger(middlewareName),
  adapter: (adapterId?: string) => getLoggerFactory().createAdapterLogger(adapterId),
  websocket: (socketId?: string) => getLoggerFactory().createWebSocketLogger(socketId),
};

export default LoggerFactory;