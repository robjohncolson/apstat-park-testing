import { Request, Response, NextFunction } from "express";
import { appLogger } from "./logger";

// Application metrics tracking
interface AppMetrics {
  requestCount: number;
  errorCount: number;
  startTime: Date;
  uptime: number;
  lastError?: {
    message: string;
    timestamp: Date;
    context?: Record<string, unknown>;
  };
}

class MetricsCollector {
  private metrics: AppMetrics;

  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      startTime: new Date(),
      uptime: 0,
    };
  }

  incrementRequests(): void {
    this.metrics.requestCount++;
  }

  incrementErrors(error: string, context?: Record<string, unknown>): void {
    this.metrics.errorCount++;
    this.metrics.lastError = {
      message: error,
      timestamp: new Date(),
      context,
    };
  }

  getMetrics(): AppMetrics {
    this.metrics.uptime = Date.now() - this.metrics.startTime.getTime();
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      startTime: new Date(),
      uptime: 0,
    };
  }
}

export const metricsCollector = new MetricsCollector();

// Enhanced request middleware with metrics
export const observabilityMiddleware = (
  req: Request & { startTime?: number; logger?: import("./logger").Logger; requestId?: string },
  res: Response,
  next: NextFunction,
): void => {
  const startTime = Date.now();

  // Increment request counter
  metricsCollector.incrementRequests();

  // Add to existing request logger functionality
  req.startTime = startTime;

  // Log response completion with timing
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log slow requests as warnings
    if (duration > 1000) {
      req.logger?.warn("Slow request detected", {
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration}ms`,
        slowRequest: true,
      });
    }

    // Log errors
    if (statusCode >= 400) {
      metricsCollector.incrementErrors(`HTTP ${statusCode}`, {
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration}ms`,
      });
    }
  });

  next();
};

// Health check endpoint handler
export const healthCheckHandler = (req: Request, res: Response) => {
  const metrics = metricsCollector.getMetrics();

  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(metrics.uptime / 1000), // uptime in seconds
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    metrics: {
      totalRequests: metrics.requestCount,
      errorCount: metrics.errorCount,
      errorRate:
        metrics.requestCount > 0
          ? (metrics.errorCount / metrics.requestCount) * 100
          : 0,
    },
    system: {
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      platform: process.platform,
      pid: process.pid,
    },
  };

  // Determine overall health
  const errorRate = healthStatus.metrics.errorRate;
  if (errorRate > 10) {
    healthStatus.status = "degraded";
  }
  if (errorRate > 25) {
    healthStatus.status = "unhealthy";
  }

  // Log health check
  appLogger.debug("Health check requested", {
    status: healthStatus.status,
    errorRate: errorRate.toFixed(2) + "%",
    uptime: healthStatus.uptime + "s",
  });

  res
    .status(healthStatus.status === "unhealthy" ? 503 : 200)
    .json(healthStatus);
};

// Metrics endpoint handler
export const metricsHandler = (req: Request, res: Response) => {
  const metrics = metricsCollector.getMetrics();

  appLogger.debug("Metrics requested", {
    requestCount: metrics.requestCount,
    errorCount: metrics.errorCount,
    uptime: Math.floor(metrics.uptime / 1000) + "s",
  });

  res.json({
    timestamp: new Date().toISOString(),
    ...metrics,
    uptime: Math.floor(metrics.uptime / 1000), // Convert to seconds
  });
};

// Error handler middleware
export const errorHandler = (
  error: Error,
  req: Request & { logger?: import("./logger").Logger; requestId?: string },
  res: Response,
  next: NextFunction,
): void => {
  metricsCollector.incrementErrors(error.message, {
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
  });

  req.logger?.error(
    "Unhandled error in request",
    {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    },
    error,
  );

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    requestId: req.requestId,
  });
};

// Process-level error handlers
export const setupProcessErrorHandlers = () => {
  process.on("uncaughtException", (error: Error) => {
    appLogger.error(
      "Uncaught Exception - Server will exit",
      {
        error: error.message,
        stack: error.stack,
        fatal: true,
      },
      error,
    );

    // Give Winston time to write the log
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    appLogger.error(
      "Unhandled Promise Rejection",
      {
        reason: (reason as Error | string | undefined)?.toString(),
        stack: (reason as Error | undefined)?.stack,
        promise: promise.toString(),
      },
      reason instanceof Error ? (reason as Error) : undefined,
    );
  });

  process.on("SIGTERM", () => {
    appLogger.info("SIGTERM received - graceful shutdown initiated");
  });

  process.on("SIGINT", () => {
    appLogger.info("SIGINT received - graceful shutdown initiated");
  });
};

// Log application startup information
export const logStartupInfo = (port: number) => {
  appLogger.info("APStat Park API - Observability initialized", {
    port,
    environment: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    pid: process.pid,
    features: {
      winston: true,
      metrics: true,
      healthCheck: true,
      errorHandling: true,
    },
  });
};
