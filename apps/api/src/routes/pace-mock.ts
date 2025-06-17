import { Router } from 'express';
import { z } from 'zod';
import { appLogger as logger } from '../logger';

// Simple in-memory storage for development
const mockPaceData = new Map<number, {
  userId: number;
  currentDeadline: Date | null;
  bufferHours: number;
  lastCompletedLessons: number;
  lastLessonCompletion: Date | null;
  updatedAt: Date;
}>();

// Validation schemas
const updatePaceRequestSchema = z.object({
  completedLessons: z.number().min(0),
  totalLessons: z.number().min(1),
  examDate: z.string().datetime().optional(),
});

// Mock exam date (May 13th of current or next year)
function getDefaultExamDate(): Date {
  const currentYear = new Date().getFullYear();
  const mayExamDate = new Date(currentYear, 4, 13, 8, 0, 0); // May 13th, 8:00 AM
  
  if (new Date() > mayExamDate) {
    return new Date(currentYear + 1, 4, 13, 8, 0, 0);
  }
  
  return mayExamDate;
}

// Simple pace calculation
function calculateMockMetrics(completedLessons: number, totalLessons: number, bufferHours: number = 0) {
  const examDate = getDefaultExamDate();
  const now = new Date();
  const msUntilExam = examDate.getTime() - now.getTime();
  
  const daysUntilExam = Math.max(0, Math.ceil(msUntilExam / (1000 * 60 * 60 * 24)));
  const hoursUntilExam = Math.max(0, msUntilExam / (1000 * 60 * 60));
  const lessonsRemaining = Math.max(0, totalLessons - completedLessons);
  
  let hoursPerLesson = 0;
  let nextDeadline = examDate;
  let paceStatus: "ahead" | "on-track" | "behind" | "unknown" = "unknown";
  
  if (lessonsRemaining > 0 && hoursUntilExam > 0) {
    hoursPerLesson = hoursUntilExam / lessonsRemaining;
    const deadlineMs = now.getTime() + (hoursPerLesson * 60 * 60 * 1000) + (bufferHours * 60 * 60 * 1000);
    nextDeadline = new Date(deadlineMs);
    
    const aheadLessons = bufferHours / hoursPerLesson;
    if (aheadLessons >= 1.0) {
      paceStatus = "ahead";
    } else if (aheadLessons >= -0.5) {
      paceStatus = "on-track";
    } else {
      paceStatus = "behind";
    }
  }
  
  return {
    daysUntilExam,
    hoursUntilExam,
    lessonsRemaining,
    totalLessons,
    completedLessons,
    lessonsPerDay: lessonsRemaining / Math.max(daysUntilExam, 1),
    hoursPerLesson,
    isOnTrack: paceStatus !== "behind",
    paceStatus,
    targetLessonsPerDay: lessonsRemaining / Math.max(daysUntilExam, 1),
    targetHoursPerDay: (lessonsRemaining / Math.max(daysUntilExam, 1)) * hoursPerLesson,
    nextDeadline: nextDeadline.toISOString(),
    bufferHours,
    aheadLessons: bufferHours / Math.max(hoursPerLesson, 1),
  };
}

export function createMockPaceRouter() {
  const router = Router();

  // GET /api/v1/pace/:userId - Get user's pace data and metrics
  router.get('/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      const { completedLessons, totalLessons } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Get or create mock pace data
      let paceData = mockPaceData.get(userIdNum);
      if (!paceData) {
        paceData = {
          userId: userIdNum,
          currentDeadline: null,
          bufferHours: 0,
          lastCompletedLessons: 0,
          lastLessonCompletion: null,
          updatedAt: new Date(),
        };
        mockPaceData.set(userIdNum, paceData);
      }

      let metrics = undefined;
      if (completedLessons && totalLessons) {
        const completedNum = parseFloat(completedLessons as string);
        const totalNum = parseFloat(totalLessons as string);
        
        if (!isNaN(completedNum) && !isNaN(totalNum)) {
          metrics = calculateMockMetrics(completedNum, totalNum, paceData.bufferHours);
        }
      }

      const response = {
        userId: paceData.userId,
        currentDeadline: paceData.currentDeadline?.toISOString() || null,
        bufferHours: paceData.bufferHours,
        lastCompletedLessons: paceData.lastCompletedLessons,
        lastLessonCompletion: paceData.lastLessonCompletion?.toISOString() || null,
        examDate: getDefaultExamDate().toISOString(),
        updatedAt: paceData.updatedAt.toISOString(),
        metrics,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error fetching mock pace data:', { 
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId 
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/v1/pace/:userId - Update user's pace based on lesson progress
  router.put('/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      const validatedData = updatePaceRequestSchema.parse(req.body);

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const { completedLessons, totalLessons } = validatedData;
      
      // Get or create mock pace data
      let paceData = mockPaceData.get(userIdNum);
      if (!paceData) {
        paceData = {
          userId: userIdNum,
          currentDeadline: null,
          bufferHours: 0,
          lastCompletedLessons: 0,
          lastLessonCompletion: null,
          updatedAt: new Date(),
        };
      }

      // Simple lesson completion detection
      const lessonCompleted = Math.floor(completedLessons) > Math.floor(paceData.lastCompletedLessons);
      let wasLessonCompleted = false;

      if (lessonCompleted && paceData.currentDeadline) {
        // Calculate time saved
        const deadline = new Date(paceData.currentDeadline);
        const now = new Date();
        const timeSavedMs = deadline.getTime() - now.getTime();
        const timeSavedHours = timeSavedMs / (1000 * 60 * 60);
        
        if (timeSavedHours > 0) {
          paceData.bufferHours = Math.min(paceData.bufferHours + timeSavedHours, 336);
          wasLessonCompleted = true;
        }
      }

      // Update pace data
      paceData.lastCompletedLessons = completedLessons;
      paceData.lastLessonCompletion = wasLessonCompleted ? new Date() : paceData.lastLessonCompletion;
      paceData.updatedAt = new Date();
      
      // Calculate new deadline
      const metrics = calculateMockMetrics(completedLessons, totalLessons, paceData.bufferHours);
      paceData.currentDeadline = new Date(metrics.nextDeadline);
      
      mockPaceData.set(userIdNum, paceData);

      const response = {
        userId: paceData.userId,
        currentDeadline: paceData.currentDeadline.toISOString(),
        bufferHours: paceData.bufferHours,
        lastCompletedLessons: paceData.lastCompletedLessons,
        lastLessonCompletion: paceData.lastLessonCompletion?.toISOString() || null,
        examDate: getDefaultExamDate().toISOString(),
        updatedAt: paceData.updatedAt.toISOString(),
        metrics,
        wasLessonCompleted,
      };

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }

      logger.error('Error updating mock pace data:', { 
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId 
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
} 