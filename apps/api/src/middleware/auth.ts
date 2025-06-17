import { Request, Response, NextFunction } from 'express';
import { appLogger as logger } from '../logger';

// User interface for authenticated requests
export interface AuthenticatedUser {
  id: number;
  username: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Simple user validation middleware
// In a production app, this would validate JWT tokens or sessions
export function validateUser(req: Request, res: Response, next: NextFunction) {
  try {
    // For now, we trust the userId from the URL
    // In production, this would validate against authenticated user session
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum) || userIdNum <= 0) {
      return res.status(400).json({ 
        error: 'Invalid user ID format' 
      });
    }

    // Add user info to request
    req.user = {
      id: userIdNum,
      username: `user_${userIdNum}`, // Placeholder
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware to ensure user can only access their own data
export function requireSelfAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId, 10);

    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not authenticated' 
      });
    }

    if (req.user.id !== userIdNum) {
      logger.warn('Unauthorized access attempt:', {
        requestedUserId: userIdNum,
        authenticatedUserId: req.user.id,
        ip: req.ip,
      });
      
      return res.status(403).json({ 
        error: 'Access denied: You can only access your own data' 
      });
    }

    next();
  } catch (error) {
    logger.error('Self-access middleware error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Rate limiting middleware for pace updates
const updateAttempts = new Map<number, { count: number; resetTime: number }>();
const MAX_UPDATES_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export function rateLimitPaceUpdates(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'PUT') {
    return next();
  }

  const userId = req.user?.id;
  if (!userId) {
    return next();
  }

  const now = Date.now();
  const userAttempts = updateAttempts.get(userId);

  // Clean expired entries
  if (userAttempts && now > userAttempts.resetTime) {
    updateAttempts.delete(userId);
  }

  const currentAttempts = updateAttempts.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

  if (currentAttempts.count >= MAX_UPDATES_PER_MINUTE) {
    logger.warn('Rate limit exceeded for pace updates:', {
      userId,
      attempts: currentAttempts.count,
      ip: req.ip,
    });

    return res.status(429).json({
      error: 'Too many update requests. Please wait before trying again.',
      retryAfter: Math.ceil((currentAttempts.resetTime - now) / 1000),
    });
  }

  // Increment attempts
  currentAttempts.count++;
  updateAttempts.set(userId, currentAttempts);

  next();
} 