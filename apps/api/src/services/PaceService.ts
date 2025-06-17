import { Pool } from 'pg';
import { appLogger as logger } from '../logger';

// Core types
export interface PaceData {
  userId: number;
  currentDeadline: Date | null;
  bufferHours: number;
  lastCompletedLessons: number;
  lastLessonCompletion: Date | null;
  updatedAt: Date;
}

export interface PaceMetrics {
  daysUntilExam: number;
  hoursUntilExam: number;
  lessonsRemaining: number;
  totalLessons: number;
  completedLessons: number;
  lessonsPerDay: number;
  hoursPerLesson: number;
  isOnTrack: boolean;
  paceStatus: "ahead" | "on-track" | "behind" | "unknown";
  targetLessonsPerDay: number;
  targetHoursPerDay: number;
  nextDeadline: Date;
  bufferHours: number;
  aheadLessons: number;
}

export interface PaceCalculationInput {
  userId: number;
  completedLessons: number;
  totalLessons: number;
  currentDate?: Date;
  examDate?: Date;
  currentPaceData?: PaceData | null;
}

export interface PaceUpdateResult {
  paceData: PaceData;
  metrics: PaceMetrics;
  wasLessonCompleted: boolean;
}

/**
 * Pure function to calculate comprehensive pace metrics
 */
export function calculatePaceMetrics(
  completedLessons: number,
  totalLessons: number,
  examDate: Date,
  currentDate: Date = new Date(),
  bufferHours: number = 0,
  currentDeadline?: Date | null
): PaceMetrics {
  const msUntilExam = examDate.getTime() - currentDate.getTime();
  
  // Basic time calculations
  const daysUntilExam = Math.max(0, Math.ceil(msUntilExam / (1000 * 60 * 60 * 24)));
  const hoursUntilExam = Math.max(0, msUntilExam / (1000 * 60 * 60));
  const lessonsRemaining = Math.max(0, totalLessons - completedLessons);

  // Initialize defaults
  let targetLessonsPerDay = 0;
  let targetHoursPerDay = 0;
  const lessonsPerDay = 0;
  let hoursPerLesson = 0;
  let isOnTrack = true;
  let paceStatus: "ahead" | "on-track" | "behind" | "unknown" = "unknown";
  let nextDeadline: Date = new Date(currentDate);
  let aheadLessons = 0;

  if (daysUntilExam > 0 && hoursUntilExam > 0) {
    if (lessonsRemaining > 0) {
      // Calculate time per lesson
      hoursPerLesson = hoursUntilExam / lessonsRemaining;
      
      // Calculate next deadline
      if (currentDeadline && currentDeadline > currentDate) {
        // Use existing deadline if valid
        nextDeadline = currentDeadline;
      } else {
        // Calculate new deadline with buffer
        const deadlineMs = currentDate.getTime() + 
          (hoursPerLesson * 60 * 60 * 1000) + 
          (bufferHours * 60 * 60 * 1000);
        nextDeadline = new Date(deadlineMs);
      }

      // Calculate how many lessons ahead/behind based on buffer
      if (hoursPerLesson > 0) {
        aheadLessons = Math.round((bufferHours / hoursPerLesson) * 10) / 10;
      }
    } else {
      // All lessons complete
      hoursPerLesson = 0;
      nextDeadline = examDate;
      aheadLessons = Math.round((bufferHours / 24) * 10) / 10; // Convert to days
    }

    // Target calculations
    if (daysUntilExam > 0) {
      targetLessonsPerDay = lessonsRemaining / daysUntilExam;
      targetHoursPerDay = targetLessonsPerDay * (hoursPerLesson > 0 ? hoursPerLesson : 1.5);
    }

    // Determine pace status
    if (aheadLessons >= 1.0) {
      paceStatus = "ahead";
      isOnTrack = true;
    } else if (aheadLessons >= -0.5) {
      paceStatus = "on-track";
      isOnTrack = true;
    } else {
      paceStatus = "behind";
      isOnTrack = false;
    }
  }

  return {
    daysUntilExam,
    hoursUntilExam,
    lessonsRemaining,
    totalLessons,
    completedLessons,
    lessonsPerDay,
    hoursPerLesson,
    isOnTrack,
    paceStatus,
    targetLessonsPerDay,
    targetHoursPerDay,
    nextDeadline,
    bufferHours,
    aheadLessons,
  };
}

/**
 * Pure function to determine if a lesson was completed
 */
export function detectLessonCompletion(
  currentLessons: number,
  previousLessons: number
): boolean {
  return Math.floor(currentLessons) > Math.floor(previousLessons);
}

/**
 * Pure function to calculate new buffer after lesson completion
 */
export function calculateNewBuffer(
  currentBuffer: number,
  timeSavedHours: number,
  lessonsCompleted: number,
  maxBufferHours: number = 336
): number {
  const newBuffer = currentBuffer + (timeSavedHours * lessonsCompleted);
  return Math.min(Math.max(newBuffer, 0), maxBufferHours);
}

/**
 * Get default exam date (May 13th of current or next year)
 */
export function getDefaultExamDate(): Date {
  const currentYear = new Date().getFullYear();
  const mayExamDate = new Date(currentYear, 4, 13, 8, 0, 0); // May 13th, 8:00 AM
  
  if (new Date() > mayExamDate) {
    return new Date(currentYear + 1, 4, 13, 8, 0, 0);
  }
  
  return mayExamDate;
}

/**
 * PaceService class with database operations
 */
export class PaceService {
  constructor(private pool: Pool) {}

  /**
   * Get user's pace data, creating a default record if none exists
   */
  async getUserPaceData(userId: number): Promise<PaceData> {
    const result = await this.pool.query(
      'SELECT * FROM user_pace WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      const record = result.rows[0];
      return {
        userId: record.user_id,
        currentDeadline: record.current_deadline,
        bufferHours: parseFloat(record.buffer_hours),
        lastCompletedLessons: parseFloat(record.last_completed_lessons),
        lastLessonCompletion: record.last_lesson_completion,
        updatedAt: record.updated_at,
      };
    }

    // Create default record
    const insertResult = await this.pool.query(
      'INSERT INTO user_pace (user_id, buffer_hours, last_completed_lessons) VALUES ($1, $2, $3) RETURNING *',
      [userId, 0, 0]
    );

    const newRecord = insertResult.rows[0];
    return {
      userId: newRecord.user_id,
      currentDeadline: newRecord.current_deadline,
      bufferHours: parseFloat(newRecord.buffer_hours),
      lastCompletedLessons: parseFloat(newRecord.last_completed_lessons),
      lastLessonCompletion: newRecord.last_lesson_completion,
      updatedAt: newRecord.updated_at,
    };
  }

  /**
   * Update user's pace data in database
   */
  async updateUserPaceData(paceData: PaceData): Promise<void> {
    await this.pool.query(
      `UPDATE user_pace 
       SET current_deadline = $1, buffer_hours = $2, last_completed_lessons = $3, 
           last_lesson_completion = $4, updated_at = $5
       WHERE user_id = $6`,
      [
        paceData.currentDeadline,
        paceData.bufferHours,
        paceData.lastCompletedLessons,
        paceData.lastLessonCompletion,
        paceData.updatedAt,
        paceData.userId,
      ]
    );
  }

  /**
   * Calculate and update pace for a user
   */
  async calculateAndUpdatePace(input: PaceCalculationInput): Promise<PaceUpdateResult> {
    const {
      userId,
      completedLessons,
      totalLessons,
      currentDate = new Date(),
      examDate = getDefaultExamDate(),
    } = input;

    // Get current pace data
    const currentPaceData = input.currentPaceData || await this.getUserPaceData(userId);
    
    // Check if a lesson was completed
    const wasLessonCompleted = detectLessonCompletion(
      completedLessons,
      currentPaceData.lastCompletedLessons
    );

    let newPaceData = { ...currentPaceData };
    let newBufferHours = currentPaceData.bufferHours;
    let newDeadline = currentPaceData.currentDeadline;

    // Handle lesson completion
    if (wasLessonCompleted && currentPaceData.currentDeadline) {
      const deadline = new Date(currentPaceData.currentDeadline);
      const timeSavedMs = deadline.getTime() - currentDate.getTime();
      const timeSavedHours = timeSavedMs / (1000 * 60 * 60);
      const lessonsCompletedCount = Math.floor(completedLessons) - Math.floor(currentPaceData.lastCompletedLessons);

      // Calculate new buffer
      newBufferHours = calculateNewBuffer(
        currentPaceData.bufferHours,
        timeSavedHours,
        lessonsCompletedCount
      );

      // Reset deadline so new one gets calculated
      newDeadline = null;

      logger.info('Lesson completed, buffer updated', {
        userId,
        lessonsCompleted: lessonsCompletedCount,
        timeSavedHours: timeSavedHours.toFixed(2),
        newBuffer: newBufferHours.toFixed(2),
      });
    }

    // Calculate metrics with current state
    const metrics = calculatePaceMetrics(
      completedLessons,
      totalLessons,
      examDate,
      currentDate,
      newBufferHours,
      newDeadline
    );

    // Update pace data
    newPaceData = {
      ...newPaceData,
      currentDeadline: metrics.nextDeadline,
      bufferHours: newBufferHours,
      lastCompletedLessons: completedLessons,
      lastLessonCompletion: wasLessonCompleted ? currentDate : currentPaceData.lastLessonCompletion,
      updatedAt: currentDate,
    };

    // Save to database
    await this.updateUserPaceData(newPaceData);

    return {
      paceData: newPaceData,
      metrics,
      wasLessonCompleted,
    };
  }

  /**
   * Get full pace state for a user (data + metrics)
   */
  async getUserPaceState(
    userId: number,
    completedLessons: number,
    totalLessons: number,
    examDate: Date = getDefaultExamDate()
  ): Promise<{ paceData: PaceData; metrics: PaceMetrics }> {
    const paceData = await this.getUserPaceData(userId);
    const metrics = calculatePaceMetrics(
      completedLessons,
      totalLessons,
      examDate,
      new Date(),
      paceData.bufferHours,
      paceData.currentDeadline
    );

    return { paceData, metrics };
  }
} 