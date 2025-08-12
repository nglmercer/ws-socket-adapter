// ClientLogger.ts - Browser-compatible logging utility for client components
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
/**
 * Browser-compatible logger for client components
 * Does not use Node.js modules like fs or path
 */
export class ClientLogger {
    constructor(config = {}) {
        this.config = {
            level: LogLevel.INFO,
            prefix: 'ws-client',
            enableConsole: true,
            enableTimestamps: true,
            enableColors: true,
            ...config,
        };
    }
    shouldLog(level) {
        return level >= this.config.level && this.config.enableConsole;
    }
    formatMessage(level, event, message, data) {
        const timestamp = this.config.enableTimestamps
            ? new Date().toISOString()
            : '';
        const prefix = `[${timestamp}] ${this.config.prefix}:${level} [${event}]`;
        let formatted = `${prefix} ${message}`;
        if (data !== undefined) {
            try {
                formatted += ` | Data: ${JSON.stringify(data)}`;
            }
            catch (error) {
                formatted += ` | Data: ${data}`;
            }
        }
        return formatted;
    }
    getConsoleMethod(level) {
        switch (level) {
            case LogLevel.DEBUG:
                return console.debug || console.log;
            case LogLevel.INFO:
                return console.info || console.log;
            case LogLevel.WARN:
                return console.warn || console.log;
            case LogLevel.ERROR:
                return console.error || console.log;
            default:
                return console.log;
        }
    }
    debug(event, message, data) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            const formatted = this.formatMessage('DEBUG', event, message, data);
            this.getConsoleMethod(LogLevel.DEBUG)(formatted);
        }
    }
    info(event, message, data) {
        if (this.shouldLog(LogLevel.INFO)) {
            const formatted = this.formatMessage('INFO', event, message, data);
            this.getConsoleMethod(LogLevel.INFO)(formatted);
        }
    }
    warn(event, message, data) {
        if (this.shouldLog(LogLevel.WARN)) {
            const formatted = this.formatMessage('WARN', event, message, data);
            this.getConsoleMethod(LogLevel.WARN)(formatted);
        }
    }
    error(event, message, data) {
        if (this.shouldLog(LogLevel.ERROR)) {
            const formatted = this.formatMessage('ERROR', event, message, data);
            this.getConsoleMethod(LogLevel.ERROR)(formatted);
        }
    }
    /**
     * Performance logging for high-frequency operations
     */
    performance(event, duration, data) {
        this.debug(`performance:${event}`, `Operation completed in ${duration}ms`, {
            ...data,
            duration,
            performanceLog: true
        });
    }
    /**
     * Connection lifecycle logging
     */
    connection(event, socketId, data) {
        this.info(`connection:${event}`, `Connection ${event}`, {
            ...data,
            socketId,
            connectionEvent: true
        });
    }
    /**
     * Update logger configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Enable/disable debug mode
     */
    setDebug(enabled) {
        this.config.level = enabled ? LogLevel.DEBUG : LogLevel.INFO;
    }
}
/**
 * Create a client logger instance
 */
export function createClientLogger(config) {
    return new ClientLogger(config);
}
export default ClientLogger;
//# sourceMappingURL=ClientLogger.js.map