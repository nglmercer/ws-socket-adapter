// ClientLogger.ts - Browser-compatible logging utility for client components

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
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
export class ClientLogger {
  private config: ClientLoggerConfig;

  constructor(config: Partial<ClientLoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      prefix: 'ws-client',
      enableConsole: true,
      enableTimestamps: true,
      enableColors: true,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level && this.config.enableConsole;
  }

  private formatMessage(level: string, event: string, message: string, data?: any): string {
    const timestamp = this.config.enableTimestamps 
      ? new Date().toISOString() 
      : '';
    
    const prefix = `[${timestamp}] ${this.config.prefix}:${level} [${event}]`;
    let formatted = `${prefix} ${message}`;
    
    if (data !== undefined) {
      try {
        formatted += ` | Data: ${JSON.stringify(data)}`;
      } catch (error) {
        formatted += ` | Data: ${data}`;
      }
    }
    
    return formatted;
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
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

  debug(event: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage('DEBUG', event, message, data);
      this.getConsoleMethod(LogLevel.DEBUG)(formatted);
    }
  }

  info(event: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage('INFO', event, message, data);
      this.getConsoleMethod(LogLevel.INFO)(formatted);
    }
  }

  warn(event: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage('WARN', event, message, data);
      this.getConsoleMethod(LogLevel.WARN)(formatted);
    }
  }

  error(event: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formatted = this.formatMessage('ERROR', event, message, data);
      this.getConsoleMethod(LogLevel.ERROR)(formatted);
    }
  }

  /**
   * Performance logging for high-frequency operations
   */
  performance(event: string, duration: number, data?: any): void {
    this.debug(`performance:${event}`, `Operation completed in ${duration}ms`, {
      ...data,
      duration,
      performanceLog: true
    });
  }

  /**
   * Connection lifecycle logging
   */
  connection(event: string, socketId?: string, data?: any): void {
    this.info(`connection:${event}`, `Connection ${event}`, {
      ...data,
      socketId,
      connectionEvent: true
    });
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<ClientLoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Enable/disable debug mode
   */
  setDebug(enabled: boolean): void {
    this.config.level = enabled ? LogLevel.DEBUG : LogLevel.INFO;
  }
}

/**
 * Create a client logger instance
 */
export function createClientLogger(config?: Partial<ClientLoggerConfig>): ClientLogger {
  return new ClientLogger(config);
}

export default ClientLogger;