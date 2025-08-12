export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export interface ClientLoggerConfig {
    level: LogLevel;
    prefix: string;
    enableConsole: boolean;
    enableTimestamps: boolean;
    enableColors: boolean;
}
/**
 * Browser-compatible logger for client components
 * Does not use Node.js modules like fs or path
 */
export declare class ClientLogger {
    private config;
    constructor(config?: Partial<ClientLoggerConfig>);
    private shouldLog;
    private formatMessage;
    private getConsoleMethod;
    debug(event: string, message: string, data?: any): void;
    info(event: string, message: string, data?: any): void;
    warn(event: string, message: string, data?: any): void;
    error(event: string, message: string, data?: any): void;
    /**
     * Performance logging for high-frequency operations
     */
    performance(event: string, duration: number, data?: any): void;
    /**
     * Connection lifecycle logging
     */
    connection(event: string, socketId?: string, data?: any): void;
    /**
     * Update logger configuration
     */
    updateConfig(newConfig: Partial<ClientLoggerConfig>): void;
    /**
     * Enable/disable debug mode
     */
    setDebug(enabled: boolean): void;
}
/**
 * Create a client logger instance
 */
export declare function createClientLogger(config?: Partial<ClientLoggerConfig>): ClientLogger;
export default ClientLogger;
//# sourceMappingURL=ClientLogger.d.ts.map