export { Logger, LogLevel, type LoggerConfig, type LogEntry, getLogger, pushLogs, ExtendedLogger } from './Logger.js';
export { LoggerConfigs, SocketIOAdapterConfigs, getConfigForEnvironment, createCustomConfig, validateConfig, DEFAULT_CONFIG, } from './config.js';
export type { LoggerConfig as ILoggerConfig, LogEntry as ILogEntry, } from './Logger.js';
/**
 * Logger por defecto configurado automáticamente según el entorno
 */
export declare const defaultLogger: import("./Logger.js").ExtendedLogger;
/**
 * Funciones de conveniencia que usan el logger por defecto
 */
export declare const log: {
    debug: (event: string, message: string, data?: any, context?: Record<string, any>) => void;
    info: (event: string, message: string, data?: any, context?: Record<string, any>) => void;
    warn: (event: string, message: string, data?: any, context?: Record<string, any>) => void;
    error: (event: string, message: string, data?: any, context?: Record<string, any>) => void;
    fatal: (event: string, message: string, data?: any, context?: Record<string, any>) => void;
};
export declare const logger: import("./Logger.js").ExtendedLogger;
export default defaultLogger;
//# sourceMappingURL=index.d.ts.map