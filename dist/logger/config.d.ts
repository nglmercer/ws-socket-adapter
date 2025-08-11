import { type LoggerConfig } from './Logger.js';
/**
 * Configuraciones predefinidas para diferentes entornos
 */
export declare const LoggerConfigs: {
    /**
     * Configuración para desarrollo
     */
    development: LoggerConfig;
    /**
     * Configuración para producción
     */
    production: LoggerConfig;
    /**
     * Configuración para testing
     */
    test: LoggerConfig;
    /**
     * Configuración solo para consola (útil para debugging)
     */
    console: LoggerConfig;
    /**
     * Configuración silenciosa (solo errores críticos)
     */
    silent: LoggerConfig;
};
/**
 * Obtener configuración basada en el entorno
 */
export declare function getConfigForEnvironment(env?: string): LoggerConfig;
/**
 * Crear configuración personalizada mezclando una base con overrides
 */
export declare function createCustomConfig(baseConfig: keyof typeof LoggerConfigs | LoggerConfig, overrides?: Partial<LoggerConfig>): LoggerConfig;
/**
 * Validar configuración del logger
 */
export declare function validateConfig(config: Partial<LoggerConfig>): string[];
/**
 * Configuraciones específicas para componentes del Socket.IO adapter
 */
export declare const SocketIOAdapterConfigs: {
    /**
     * Configuración para el cliente WebSocket
     */
    client: Partial<LoggerConfig>;
    /**
     * Configuración para el servidor
     */
    server: Partial<LoggerConfig>;
    /**
     * Configuración para operaciones de alta frecuencia (emitter, rooms)
     */
    highFrequency: Partial<LoggerConfig>;
    /**
     * Configuración para debugging de conexiones
     */
    connection: Partial<LoggerConfig>;
};
/**
 * Configuración por defecto del sistema
 */
export declare const DEFAULT_CONFIG: LoggerConfig;
declare const _default: {
    LoggerConfigs: {
        /**
         * Configuración para desarrollo
         */
        development: LoggerConfig;
        /**
         * Configuración para producción
         */
        production: LoggerConfig;
        /**
         * Configuración para testing
         */
        test: LoggerConfig;
        /**
         * Configuración solo para consola (útil para debugging)
         */
        console: LoggerConfig;
        /**
         * Configuración silenciosa (solo errores críticos)
         */
        silent: LoggerConfig;
    };
    SocketIOAdapterConfigs: {
        /**
         * Configuración para el cliente WebSocket
         */
        client: Partial<LoggerConfig>;
        /**
         * Configuración para el servidor
         */
        server: Partial<LoggerConfig>;
        /**
         * Configuración para operaciones de alta frecuencia (emitter, rooms)
         */
        highFrequency: Partial<LoggerConfig>;
        /**
         * Configuración para debugging de conexiones
         */
        connection: Partial<LoggerConfig>;
    };
    getConfigForEnvironment: typeof getConfigForEnvironment;
    createCustomConfig: typeof createCustomConfig;
    validateConfig: typeof validateConfig;
    DEFAULT_CONFIG: LoggerConfig;
};
export default _default;
//# sourceMappingURL=config.d.ts.map