import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pool } from 'pg';
import {
  PaceService,
  calculatePaceMetrics,
  detectLessonCompletion,
  calculateNewBuffer,
  getDefaultExamDate,
} from './PaceService';

// Mock pg Pool
const mockPool = {
  query: vi.fn(),
} as unknown as Pool;

describe('PaceService Pure Functions', () => {
  describe('calculatePaceMetrics', () => {
    const examDate = new Date('2024-05-13T08:00:00.000Z');
    const currentDate = new Date('2024-04-13T10:00:00.000Z'); // 30 days before exam

    it('should calculate metrics for in-progress lessons', () => {
      const metrics = calculatePaceMetrics(35, 50, examDate, currentDate, 5);

      expect(metrics.completedLessons).toBe(35);
      expect(metrics.totalLessons).toBe(50);
      expect(metrics.lessonsRemaining).toBe(15);
      expect(metrics.daysUntilExam).toBe(30);
      expect(metrics.targetLessonsPerDay).toBeCloseTo(0.5, 1);
      expect(metrics.aheadLessons).toBeGreaterThan(0);
      expect(metrics.paceStatus).toBe('ahead');
    });

    it('should handle completed lessons correctly', () => {
      const metrics = calculatePaceMetrics(50, 50, examDate, currentDate, 48);

      expect(metrics.lessonsRemaining).toBe(0);
      expect(metrics.nextDeadline).toEqual(examDate);
      expect(metrics.aheadLessons).toBeCloseTo(2, 1); // 48 hours = 2 days
    });

    it('should handle negative buffer (behind schedule)', () => {
      const metrics = calculatePaceMetrics(10, 50, examDate, currentDate, -24);

      expect(metrics.paceStatus).toBe('behind');
      expect(metrics.isOnTrack).toBe(false);
      expect(metrics.aheadLessons).toBeLessThan(-0.5);
    });

    it('should handle exam already passed', () => {
      const pastExamDate = new Date('2024-03-13T08:00:00.000Z');
      const metrics = calculatePaceMetrics(35, 50, pastExamDate, currentDate, 0);

      expect(metrics.daysUntilExam).toBe(0);
      expect(metrics.hoursUntilExam).toBe(0);
    });

    it('should handle zero lessons', () => {
      const metrics = calculatePaceMetrics(0, 50, examDate, currentDate, 0);

      expect(metrics.completedLessons).toBe(0);
      expect(metrics.lessonsRemaining).toBe(50);
      expect(metrics.paceStatus).toBe('on-track');
    });
  });

  describe('detectLessonCompletion', () => {
    it('should detect when a whole lesson is completed', () => {
      expect(detectLessonCompletion(5.0, 4.9)).toBe(true);
      expect(detectLessonCompletion(5.1, 4.9)).toBe(true);
      expect(detectLessonCompletion(6.0, 5.0)).toBe(true);
    });

    it('should not detect completion for fractional progress', () => {
      expect(detectLessonCompletion(4.9, 4.8)).toBe(false);
      expect(detectLessonCompletion(5.0, 5.0)).toBe(false);
      expect(detectLessonCompletion(4.8, 4.9)).toBe(false); // Going backwards
    });
  });

  describe('calculateNewBuffer', () => {
    it('should add positive time savings to buffer', () => {
      const newBuffer = calculateNewBuffer(10, 5, 1);
      expect(newBuffer).toBe(15);
    });

    it('should handle multiple lessons completed', () => {
      const newBuffer = calculateNewBuffer(10, 3, 2);
      expect(newBuffer).toBe(16); // 10 + (3 * 2)
    });

    it('should cap buffer at maximum', () => {
      const newBuffer = calculateNewBuffer(330, 10, 1, 336);
      expect(newBuffer).toBe(336);
    });

    it('should handle negative time (late completion)', () => {
      const newBuffer = calculateNewBuffer(10, -5, 1);
      expect(newBuffer).toBe(5);
    });

    it('should not go below zero', () => {
      const newBuffer = calculateNewBuffer(3, -5, 1);
      expect(newBuffer).toBe(0);
    });
  });

  describe('getDefaultExamDate', () => {
    it('should return May 13th of current year if not passed', () => {
      vi.setSystemTime(new Date('2024-03-15'));
      const examDate = getDefaultExamDate();
      expect(examDate.getFullYear()).toBe(2024);
      expect(examDate.getMonth()).toBe(4); // May is month 4
      expect(examDate.getDate()).toBe(13);
    });

    it('should return May 13th of next year if current year has passed', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      const examDate = getDefaultExamDate();
      expect(examDate.getFullYear()).toBe(2025);
      expect(examDate.getMonth()).toBe(4);
      expect(examDate.getDate()).toBe(13);
    });
  });
});

describe('PaceService Database Operations', () => {
  let paceService: PaceService;

  beforeEach(() => {
    vi.clearAllMocks();
    paceService = new PaceService(mockPool);
  });

  describe('getUserPaceData', () => {
    it('should return existing pace data', async () => {
      const mockData = {
        user_id: 123,
        current_deadline: new Date('2024-04-15T10:00:00.000Z'),
        buffer_hours: '5.5',
        last_completed_lessons: '10.0',
        last_lesson_completion: new Date('2024-04-10T15:00:00.000Z'),
        updated_at: new Date('2024-04-13T10:00:00.000Z'),
      };

      vi.mocked(mockPool.query).mockResolvedValue({ rows: [mockData] } as any);

      const result = await paceService.getUserPaceData(123);

      expect(result.userId).toBe(123);
      expect(result.bufferHours).toBe(5.5);
      expect(result.lastCompletedLessons).toBe(10.0);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM user_pace WHERE user_id = $1',
        [123]
      );
    });

    it('should create default record for new user', async () => {
      const newRecord = {
        user_id: 456,
        current_deadline: null,
        buffer_hours: '0',
        last_completed_lessons: '0',
        last_lesson_completion: null,
        updated_at: new Date('2024-04-13T10:00:00.000Z'),
      };

      vi.mocked(mockPool.query)
        .mockResolvedValueOnce({ rows: [] } as any) // No existing record
        .mockResolvedValueOnce({ rows: [newRecord] } as any); // Insert result

      const result = await paceService.getUserPaceData(456);

      expect(result.userId).toBe(456);
      expect(result.bufferHours).toBe(0);
      expect(result.lastCompletedLessons).toBe(0);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateUserPaceData', () => {
    it('should update pace data in database', async () => {
      const paceData = {
        userId: 123,
        currentDeadline: new Date('2024-04-15T10:00:00.000Z'),
        bufferHours: 8.5,
        lastCompletedLessons: 12.0,
        lastLessonCompletion: new Date('2024-04-14T09:00:00.000Z'),
        updatedAt: new Date('2024-04-13T10:00:00.000Z'),
      };

      vi.mocked(mockPool.query).mockResolvedValue({ rows: [] } as any);

      await paceService.updateUserPaceData(paceData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_pace'),
        [
          paceData.currentDeadline,
          paceData.bufferHours,
          paceData.lastCompletedLessons,
          paceData.lastLessonCompletion,
          paceData.updatedAt,
          paceData.userId,
        ]
      );
    });
  });

  describe('calculateAndUpdatePace', () => {
    it('should detect lesson completion and update buffer', async () => {
      const existingPaceData = {
        userId: 123,
        currentDeadline: new Date('2024-04-14T08:00:00.000Z'), // 2 hours saved
        bufferHours: 5,
        lastCompletedLessons: 9.5,
        lastLessonCompletion: null,
        updatedAt: new Date('2024-04-13T08:00:00.000Z'),
      };

      const mockSelect = { rows: [{ ...existingPaceData, user_id: 123, buffer_hours: '5', last_completed_lessons: '9.5' }] };
      
      vi.mocked(mockPool.query)
        .mockResolvedValueOnce(mockSelect as any) // getUserPaceData
        .mockResolvedValueOnce({ rows: [] } as any); // updateUserPaceData

      const currentDate = new Date('2024-04-14T06:00:00.000Z'); // 2 hours before deadline

      const result = await paceService.calculateAndUpdatePace({
        userId: 123,
        completedLessons: 10.0, // Lesson completed!
        totalLessons: 50,
        currentDate,
        currentPaceData: existingPaceData,
      });

      expect(result.wasLessonCompleted).toBe(true);
      expect(result.paceData.bufferHours).toBe(7); // 5 + 2 hours saved
      expect(result.paceData.currentDeadline).not.toEqual(existingPaceData.currentDeadline); // New deadline calculated
    });

    it('should handle no lesson completion', async () => {
      const existingPaceData = {
        userId: 123,
        currentDeadline: new Date('2024-04-14T08:00:00.000Z'),
        bufferHours: 5,
        lastCompletedLessons: 9.5,
        lastLessonCompletion: null,
        updatedAt: new Date('2024-04-13T08:00:00.000Z'),
      };

      vi.mocked(mockPool.query).mockResolvedValue({ rows: [] } as any);

      const result = await paceService.calculateAndUpdatePace({
        userId: 123,
        completedLessons: 9.7, // Fractional progress, no completion
        totalLessons: 50,
        currentPaceData: existingPaceData,
      });

      expect(result.wasLessonCompleted).toBe(false);
      expect(result.paceData.bufferHours).toBe(5); // Buffer unchanged
    });
  });

  describe('getUserPaceState', () => {
    it('should return combined pace data and metrics', async () => {
      const mockData = {
        user_id: 123,
        current_deadline: new Date('2024-04-15T10:00:00.000Z'),
        buffer_hours: '8.0',
        last_completed_lessons: '35.0',
        last_lesson_completion: new Date('2024-04-10T15:00:00.000Z'),
        updated_at: new Date('2024-04-13T10:00:00.000Z'),
      };

      vi.mocked(mockPool.query).mockResolvedValue({ rows: [mockData] } as any);

      const result = await paceService.getUserPaceState(123, 35, 50);

      expect(result.paceData.userId).toBe(123);
      expect(result.paceData.bufferHours).toBe(8.0);
      expect(result.metrics.completedLessons).toBe(35);
      expect(result.metrics.totalLessons).toBe(50);
    });
  });
}); 