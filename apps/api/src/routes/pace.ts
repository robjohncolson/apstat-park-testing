import { Router } from 'express';
import { z } from 'zod';
import { Pool } from 'pg';
import { appLogger as logger } from '../logger';

// Factory function to create pace router with database connection
export function createPaceRouter(pool: Pool) {
  const router = Router();

// Validation schemas
const updatePaceRequestSchema = z.object({
  completedLessons: z.number().min(0),
  totalLessons: z.number().min(1),
  examDate: z.string().datetime().optional(),
});

// GET /api/v1/pace - Get user's pace data
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get or create user pace record
    const paceResult = await pool.query(
      'SELECT * FROM user_pace WHERE user_id = $1',
      [userId]
    );

    let paceRecord = paceResult.rows[0];

    if (!paceRecord) {
      // Create default pace record for new user
      const insertResult = await pool.query(
        'INSERT INTO user_pace (user_id, buffer_hours, last_completed_lessons) VALUES ($1, $2, $3) RETURNING *',
        [userId, 0, 0]
      );
      
      paceRecord = insertResult.rows[0];
    }

    // Calculate default exam date (May 13th of current/next year)
    const currentYear = new Date().getFullYear();
    const mayExamDate = new Date(currentYear, 4, 13, 8, 0, 0); // May 13th, 8:00 AM
    const defaultExamDate = new Date() > mayExamDate 
      ? new Date(currentYear + 1, 4, 13, 8, 0, 0)
      : mayExamDate;

    const response = {
      userId: paceRecord.user_id,
      currentDeadline: paceRecord.current_deadline,
      bufferHours: parseFloat(paceRecord.buffer_hours),
      lastCompletedLessons: parseFloat(paceRecord.last_completed_lessons),
      lastLessonCompletion: paceRecord.last_lesson_completion,
      examDate: defaultExamDate.toISOString(),
      updatedAt: paceRecord.updated_at,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching pace data:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/pace - Update user's pace based on lesson progress
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const validatedData = updatePaceRequestSchema.parse(req.body);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { completedLessons, totalLessons, examDate } = validatedData;

    // Get current pace record
    const currentPaceResult = await pool.query(
      'SELECT * FROM user_pace WHERE user_id = $1',
      [userId]
    );
    const currentPace = currentPaceResult.rows[0];

    if (!currentPace) {
      return res.status(404).json({ error: 'Pace record not found' });
    }

    const lastCompletedLessons = parseFloat(currentPace.last_completed_lessons);
    const currentBufferHours = parseFloat(currentPace.buffer_hours);
    const now = new Date();

    // Check if a whole lesson was completed
    const lessonCompletionThreshold = Math.floor(lastCompletedLessons);
    const currentCompletionThreshold = Math.floor(completedLessons);

    let newBufferHours = currentBufferHours;
    let newDeadline = currentPace.current_deadline;
    let lastLessonCompletion = currentPace.last_lesson_completion;

    // If a whole lesson was completed, calculate buffer and reset deadline
    if (currentCompletionThreshold > lessonCompletionThreshold && currentPace.current_deadline) {
      const deadline = new Date(currentPace.current_deadline);
      const timeSavedMs = deadline.getTime() - now.getTime();
      const timeSavedHours = timeSavedMs / (1000 * 60 * 60);
      const lessonsCompleted = currentCompletionThreshold - lessonCompletionThreshold;

      // Add saved time to buffer (cap at 336 hours = 14 days)
      newBufferHours = Math.min(currentBufferHours + (timeSavedHours * lessonsCompleted), 336);
      newDeadline = null; // Reset deadline so a new one gets calculated
      lastLessonCompletion = now;

      logger.info(`User ${userId} completed ${lessonsCompleted} lessons, saved ${timeSavedHours.toFixed(2)} hours, new buffer: ${newBufferHours.toFixed(2)}`);
    }

    // Calculate new deadline if needed
    if (!newDeadline && completedLessons < totalLessons) {
      const examDateObj = examDate ? new Date(examDate) : new Date(new Date().getFullYear(), 4, 13, 8, 0, 0);
      const hoursUntilExam = (examDateObj.getTime() - now.getTime()) / (1000 * 60 * 60);
      const lessonsRemaining = totalLessons - completedLessons;
      
      if (lessonsRemaining > 0 && hoursUntilExam > 0) {
        const hoursPerLesson = hoursUntilExam / lessonsRemaining;
        const deadlineWithBuffer = now.getTime() + (hoursPerLesson * 60 * 60 * 1000) + (newBufferHours * 60 * 60 * 1000);
        newDeadline = new Date(deadlineWithBuffer);
      }
    }

    // Update the database
    await pool.query(
      `UPDATE user_pace 
       SET current_deadline = $1, buffer_hours = $2, last_completed_lessons = $3, 
           last_lesson_completion = $4, updated_at = $5
       WHERE user_id = $6`,
      [newDeadline, newBufferHours, completedLessons, lastLessonCompletion, now, userId]
    );

    const response = {
      userId: parseInt(userId),
      currentDeadline: newDeadline,
      bufferHours: newBufferHours,
      lastCompletedLessons: completedLessons,
      lastLessonCompletion: lastLessonCompletion,
      updatedAt: now,
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    logger.error('Error updating pace data:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

  return router;
} 