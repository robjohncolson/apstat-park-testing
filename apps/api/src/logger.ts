import winston from "winston";
import { Request, Response, NextFunction } from "express";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

// Create the logger format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    let message = `${info.timestamp} [${info.level}]: ${info.message}`;

    // Add context if available
    if (info.context && typeof info.context === "object") {
      message += ` ${JSON.stringify(info.context)}`;
    } else if (info.context) {
      message += ` ${info.context}`;
    }

    // Add error stack if available
    if (
      info.error &&
      typeof info.error === "object" &&
      "stack" in info.error &&
      typeof info.error.stack === "string"
    ) {
      message += `\n${info.error.stack}`;
    }

    return message;
  }),
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), format),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.combine(
        winston.format.uncolorize(),
        winston.format.json(),
      ),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: "logs/combined.log",
      format: winston.format.combine(
        winston.format.uncolorize(),
        winston.format.json(),
      ),
    }),
  ],
});

// Create a structured logger interface
export interface Logger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>, error?: Error) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
  http: (message: string, context?: Record<string, unknown>) => void;
  child: (context: Record<string, unknown>) => Logger;
}

// Create child logger function
function createChildLogger(parentContext: Record<string, unknown> = {}): Logger {
  return {
    info: (message: string, context: Record<string, unknown> = {}) => {
      logger.info(message, { context: { ...parentContext, ...context } });
    },
    warn: (message: string, context: Record<string, unknown> = {}) => {
      logger.warn(message, { context: { ...parentContext, ...context } });
    },
    error: (
      message: string,
      context: Record<string, unknown> = {},
      error?: Error,
    ) => {
      logger.error(message, {
        context: { ...parentContext, ...context },
        error: error || (context instanceof Error ? context : undefined),
      });
    },
    debug: (message: string, context: Record<string, unknown> = {}) => {
      logger.debug(message, { context: { ...parentContext, ...context } });
    },
    http: (message: string, context: Record<string, unknown> = {}) => {
      logger.http(message, { context: { ...parentContext, ...context } });
    },
    child: (context: Record<string, unknown>) =>
      createChildLogger({ ...parentContext, ...context }),
  };
}

// Export the main logger instance
export const appLogger: Logger = createChildLogger();

// Export HTTP request logger middleware
export const requestLogger = (
  req: Request & { logger?: Logger; requestId?: string },
  res: Response,
  next: NextFunction,
) => {
  const requestId = Math.random().toString(36).substring(2, 15);
  const startTime = Date.now();

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  // Create child logger with request context
  req.logger = appLogger.child({
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection.remoteAddress,
  });

  // Log the incoming request
  req.logger!.http(`${req.method} ${req.path}`, {
    headers: req.headers,
    query: req.query,
    body: req.method !== "GET" ? req.body : undefined,
  });

  // Log the response when it completes
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    req.logger!.http(`${req.method} ${req.path} - ${res.statusCode}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get("content-length"),
    });
  });

  next();
};

// Export utility functions
export const createLogger = (context: Record<string, unknown> = {}) =>
  appLogger.child(context);

export default appLogger;
