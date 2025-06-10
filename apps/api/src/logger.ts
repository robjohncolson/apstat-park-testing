// Simple structured logger
interface LogContext {
  requestId?: string;
  userId?: number;
  username?: string;
  [key: string]: unknown;
}

class Logger {
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('error', message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  // Create child logger with persistent context
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    const originalFormatMessage = childLogger.formatMessage.bind(childLogger);
    
    childLogger.formatMessage = (level: string, message: string, additionalContext?: LogContext) => {
      return originalFormatMessage(level, message, { ...context, ...additionalContext });
    };
    
    return childLogger;
  }
}

export const logger = new Logger();
export type { LogContext }; 