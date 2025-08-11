// config.ts - Configuración del sistema de logging
import { LogLevel } from './Logger.js';
import path from 'path';
/**
 * Configuraciones predefinidas para diferentes entornos
 */
export const LoggerConfigs = {
    /**
     * Configuración para desarrollo
     */
    development: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: true,
        logDirectory: path.join(process.cwd(), 'logs'),
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxFiles: 3,
        datePattern: 'YYYY-MM-DD',
        format: 'text',
        includeStackTrace: true,
        enableColors: true,
    },
    /**
     * Configuración para producción
     */
    production: {
        level: LogLevel.INFO,
        enableConsole: false,
        enableFile: true,
        logDirectory: path.join(process.cwd(), 'logs'),
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
        datePattern: 'YYYY-MM-DD',
        format: 'json',
        includeStackTrace: false,
        enableColors: false,
    },
    /**
     * Configuración para testing
     */
    test: {
        level: LogLevel.WARN,
        enableConsole: false,
        enableFile: false,
        logDirectory: path.join(process.cwd(), 'test-logs'),
        maxFileSize: 1 * 1024 * 1024, // 1MB
        maxFiles: 2,
        datePattern: 'YYYY-MM-DD',
        format: 'text',
        includeStackTrace: true,
        enableColors: false,
    },
    /**
     * Configuración solo para consola (útil para debugging)
     */
    console: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: false,
        logDirectory: '',
        maxFileSize: 0,
        maxFiles: 0,
        datePattern: 'YYYY-MM-DD',
        format: 'text',
        includeStackTrace: true,
        enableColors: true,
    },
    /**
     * Configuración silenciosa (solo errores críticos)
     */
    silent: {
        level: LogLevel.FATAL,
        enableConsole: true,
        enableFile: false,
        logDirectory: '',
        maxFileSize: 0,
        maxFiles: 0,
        datePattern: 'YYYY-MM-DD',
        format: 'text',
        includeStackTrace: true,
        enableColors: true,
    },
};
/**
 * Obtener configuración basada en el entorno
 */
export function getConfigForEnvironment(env) {
    const environment = env || process.env.NODE_ENV || 'development';
    switch (environment.toLowerCase()) {
        case 'production':
        case 'prod':
            return LoggerConfigs.production;
        case 'test':
        case 'testing':
            return LoggerConfigs.test;
        case 'development':
        case 'dev':
        default:
            return LoggerConfigs.development;
    }
}
/**
 * Crear configuración personalizada mezclando una base con overrides
 */
export function createCustomConfig(baseConfig, overrides = {}) {
    const base = typeof baseConfig === 'string' ? LoggerConfigs[baseConfig] : baseConfig;
    return {
        ...base,
        ...overrides,
    };
}
/**
 * Validar configuración del logger
 */
export function validateConfig(config) {
    const errors = [];
    if (config.level !== undefined && (config.level < 0 || config.level > 4)) {
        errors.push('Log level must be between 0 (DEBUG) and 4 (FATAL)');
    }
    if (config.maxFileSize !== undefined && config.maxFileSize <= 0) {
        errors.push('Max file size must be greater than 0');
    }
    if (config.maxFiles !== undefined && config.maxFiles < 1) {
        errors.push('Max files must be at least 1');
    }
    if (config.format && !['json', 'text'].includes(config.format)) {
        errors.push('Format must be either "json" or "text"');
    }
    if (config.enableFile && !config.logDirectory) {
        errors.push('Log directory is required when file logging is enabled');
    }
    return errors;
}
/**
 * Configuraciones específicas para componentes del Socket.IO adapter
 */
export const SocketIOAdapterConfigs = {
    /**
     * Configuración para el cliente WebSocket
     */
    client: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: true,
        format: 'text',
        includeStackTrace: true,
    },
    /**
     * Configuración para el servidor
     */
    server: {
        level: LogLevel.INFO,
        enableConsole: true,
        enableFile: true,
        format: 'json',
        includeStackTrace: false,
    },
    /**
     * Configuración para operaciones de alta frecuencia (emitter, rooms)
     */
    highFrequency: {
        level: LogLevel.WARN, // Reduce logging for performance
        enableConsole: false,
        enableFile: true,
        format: 'json',
        includeStackTrace: false,
    },
    /**
     * Configuración para debugging de conexiones
     */
    connection: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: true,
        format: 'text',
        includeStackTrace: true,
    },
};
/**
 * Configuración por defecto del sistema
 */
export const DEFAULT_CONFIG = LoggerConfigs.development;
export default {
    LoggerConfigs,
    SocketIOAdapterConfigs,
    getConfigForEnvironment,
    createCustomConfig,
    validateConfig,
    DEFAULT_CONFIG,
};
//# sourceMappingURL=config.js.map