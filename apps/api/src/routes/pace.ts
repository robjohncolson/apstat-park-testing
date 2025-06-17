import { Router } from 'express';
import { z } from 'zod';
import { Pool } from 'pg';
import { appLogger as logger } from '../logger';
import { PaceService, getDefaultExamDate } from '../services/PaceService';
import { validateUser, requireSelfAccess, rateLimitPaceUpdates } from '../middleware/auth';

// Validation schemas
const updatePaceRequestSchema = z.object({
  completedLessons: z.number().min(0),
  totalLessons: z.number().min(1),
  examDate: z.string().datetime().optional(),
});

// Factory function to create pace router with database connection
export function createPaceRouter(pool: Pool) {
  const router = Router();
  const paceService = new PaceService(pool);

  // Apply authentication middleware to all routes
  router.use('/:userId', validateUser, requireSelfAccess);

  // GET /api/v1/pace/:userId - Get user's pace data and metrics
  router.get('/:userId', async (req, res) => {
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

      // If lessons data provided, calculate current state
      if (completedLessons && totalLessons) {
        const completedNum = parseFloat(completedLessons as string);
        const totalNum = parseFloat(totalLessons as string);
        
        if (isNaN(completedNum) || isNaN(totalNum)) {
          return res.status(400).json({ error: 'Invalid lesson counts' });
        }

        const { paceData, metrics } = await paceService.getUserPaceState(
          userIdNum,
          completedNum,
          totalNum
        );

        return res.json({
          userId: paceData.userId,
          currentDeadline: paceData.currentDeadline,
          bufferHours: paceData.bufferHours,
          lastCompletedLessons: paceData.lastCompletedLessons,
          lastLessonCompletion: paceData.lastLessonCompletion,
          examDate: getDefaultExamDate().toISOString(),
          updatedAt: paceData.updatedAt,
          metrics,
        });
      }

      // Otherwise just return pace data
      const paceData = await paceService.getUserPaceData(userIdNum);
      
      res.json({
        userId: paceData.userId,
        currentDeadline: paceData.currentDeadline,
        bufferHours: paceData.bufferHours,
        lastCompletedLessons: paceData.lastCompletedLessons,
        lastLessonCompletion: paceData.lastLessonCompletion,
        examDate: getDefaultExamDate().toISOString(),
        updatedAt: paceData.updatedAt,
      });
    } catch (error) {
      logger.error('Error fetching pace data:', { 
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId 
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/v1/pace/:userId - Update user's pace based on lesson progress
  router.put('/:userId', rateLimitPaceUpdates, async (req, res) => {
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

      const { completedLessons, totalLessons, examDate } = validatedData;
      const examDateObj = examDate ? new Date(examDate) : getDefaultExamDate();

      // Calculate and update pace
      const result = await paceService.calculateAndUpdatePace({
        userId: userIdNum,
        completedLessons,
        totalLessons,
        examDate: examDateObj,
      });

      const response = {
        userId: result.paceData.userId,
        currentDeadline: result.paceData.currentDeadline,
        bufferHours: result.paceData.bufferHours,
        lastCompletedLessons: result.paceData.lastCompletedLessons,
        lastLessonCompletion: result.paceData.lastLessonCompletion,
        examDate: examDateObj.toISOString(),
        updatedAt: result.paceData.updatedAt,
        metrics: result.metrics,
        wasLessonCompleted: result.wasLessonCompleted,
      };

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }

      logger.error('Error updating pace data:', { 
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId 
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
} 