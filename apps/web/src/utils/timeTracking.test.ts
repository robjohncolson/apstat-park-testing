import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  calculatePaceMetrics, 
  formatTimeRemaining, 
  formatPaceStatus,
  getEncouragementMessage,
  getDefaultExamDate
} from './timeTracking';

// Mock the current date to ensure tests are deterministic
const MOCK_CURRENT_DATE = new Date('2024-04-15T10:00:00.000Z');

describe('timeTracking Utilities', () => {

  beforeEach(() => {
    // Mock the current date for consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_CURRENT_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculatePaceMetrics', () => {
    it('should correctly calculate days and lessons remaining with custom exam date', () => {
      const examDate = new Date('2024-05-13T08:00:00.000Z'); // 28 days away from mock date
      const metrics = calculatePaceMetrics(10, 50, examDate);

      expect(metrics.daysUntilExam).toBe(28);
      expect(metrics.lessonsRemaining).toBe(40);
      expect(metrics.targetLessonsPerDay).toBeCloseTo(40 / 28); // ~1.43
      expect(metrics.totalLessons).toBe(50);
      expect(metrics.completedLessons).toBe(10);
    });

    it('should return 0 for days remaining if the exam date has passed', () => {
      const examDate = new Date('2024-04-01T08:00:00.000Z'); // In the past
      const metrics = calculatePaceMetrics(50, 50, examDate);

      expect(metrics.daysUntilExam).toBe(0);
      expect(metrics.lessonsRemaining).toBe(0);
      expect(metrics.targetLessonsPerDay).toBe(0);
    });

    it('should set pace status to "ahead" when target lessons per day is low', () => {
      const examDate = new Date('2024-05-13T08:00:00.000Z'); // 28 days away
      const metrics = calculatePaceMetrics(45, 50, examDate); // Only 5 lessons remaining

      expect(metrics.paceStatus).toBe('ahead');
      expect(metrics.isOnTrack).toBe(true);
      expect(metrics.targetLessonsPerDay).toBeLessThanOrEqual(1);
    });

    it('should set pace status to "on-track" when target lessons per day is moderate', () => {
      const examDate = new Date('2024-04-29T08:00:00.000Z'); // 14 days away
      const metrics = calculatePaceMetrics(30, 50, examDate); // 20 lessons remaining

      expect(metrics.paceStatus).toBe('on-track');
      expect(metrics.isOnTrack).toBe(true);
      expect(metrics.targetLessonsPerDay).toBeCloseTo(20 / 14); // ~1.43
    });

    it('should set pace status to "behind" when target lessons per day is high', () => {
      const examDate = new Date('2024-04-22T08:00:00.000Z'); // 7 days away
      const metrics = calculatePaceMetrics(10, 50, examDate); // 40 lessons remaining

      expect(metrics.paceStatus).toBe('behind');
      expect(metrics.isOnTrack).toBe(false);
      expect(metrics.targetLessonsPerDay).toBeCloseTo(40 / 7); // ~5.71
    });
  });

  describe('formatTimeRemaining', () => {
    it('should format weeks and days correctly', () => {
      const metrics = { daysUntilExam: 23 } as any; // 3 weeks and 2 days
      expect(formatTimeRemaining(metrics)).toBe('📅 3w 2d until exam');
    });

    it('should format exact weeks correctly', () => {
      const metrics = { daysUntilExam: 14 } as any; // Exactly 2 weeks
      expect(formatTimeRemaining(metrics)).toBe('📅 2 weeks until exam');
    });

    it('should show a special message for the last 7 days', () => {
      const metrics = { daysUntilExam: 5 } as any;
      expect(formatTimeRemaining(metrics)).toBe('🔥 5 days until exam!');
    });

    it('should show special message for 1 day remaining', () => {
      const metrics = { daysUntilExam: 1 } as any;
      expect(formatTimeRemaining(metrics)).toBe('🔥 1 day until exam!');
    });

    it('should show "Exam day!" when 0 days are left', () => {
      const metrics = { daysUntilExam: 0 } as any;
      expect(formatTimeRemaining(metrics)).toBe('🎓 Exam day!');
    });

    it('should format weeks properly for 15 days (2w 1d)', () => {
      const metrics = { daysUntilExam: 15 } as any;
      expect(formatTimeRemaining(metrics)).toBe('📅 2w 1d until exam');
    });
  });

  describe('formatPaceStatus', () => {
    it('should format ahead status correctly', () => {
      const metrics = { 
        paceStatus: 'ahead' as const, 
        targetLessonsPerDay: 0.8 
      } as any;
      expect(formatPaceStatus(metrics)).toBe('🎯 Ahead of schedule! 0.8 lessons/day needed');
    });

    it('should format on-track status correctly', () => {
      const metrics = { 
        paceStatus: 'on-track' as const, 
        targetLessonsPerDay: 1.5 
      } as any;
      expect(formatPaceStatus(metrics)).toBe('✅ On track! 1.5 lessons/day needed');
    });

    it('should format behind status correctly', () => {
      const metrics = { 
        paceStatus: 'behind' as const, 
        targetLessonsPerDay: 3.2 
      } as any;
      expect(formatPaceStatus(metrics)).toBe('⚠️ Need to catch up! 3.2 lessons/day needed');
    });

    it('should format unknown status correctly', () => {
      const metrics = { 
        paceStatus: 'unknown' as const, 
        targetLessonsPerDay: 0 
      } as any;
      expect(formatPaceStatus(metrics)).toBe('📊 Calculating pace...');
    });
  });

  describe('getEncouragementMessage', () => {
    it('should return correct message for 90%+ completion', () => {
      const metrics = { completedLessons: 45, totalLessons: 50 } as any; // 90%
      expect(getEncouragementMessage(metrics)).toBe("🌟 Almost there! You've got this!");
    });

    it('should return correct message for 75%+ completion', () => {
      const metrics = { completedLessons: 38, totalLessons: 50 } as any; // 76%
      expect(getEncouragementMessage(metrics)).toBe("🔥 Strong progress! Keep it up!");
    });

    it('should return correct message for 50%+ completion', () => {
      const metrics = { completedLessons: 25, totalLessons: 50 } as any; // 50%
      expect(getEncouragementMessage(metrics)).toBe("💪 Halfway there! Steady as she goes!");
    });

    it('should return correct message for 25%+ completion', () => {
      const metrics = { completedLessons: 15, totalLessons: 50 } as any; // 30%
      expect(getEncouragementMessage(metrics)).toBe("🚀 Building momentum! Great start!");
    });

    it('should return correct message for low but non-zero completion', () => {
      const metrics = { completedLessons: 5, totalLessons: 50 } as any; // 10%
      expect(getEncouragementMessage(metrics)).toBe("🌱 Every journey begins with a single step!");
    });

    it('should return correct message for zero completion', () => {
      const metrics = { completedLessons: 0, totalLessons: 50 } as any; // 0%
      expect(getEncouragementMessage(metrics)).toBe("✨ Ready to begin your AP Stats journey?");
    });
  });

  describe('getDefaultExamDate', () => {
    it('should return May 13th for the current year when before May', () => {
      // Mock date is April 15, 2024
      const examDate = getDefaultExamDate();
      expect(examDate.getFullYear()).toBe(2024);
      expect(examDate.getMonth()).toBe(4); // May is month 4 (0-indexed)
      expect(examDate.getDate()).toBe(13);
      expect(examDate.getHours()).toBe(8);
    });

    it('should return May 13th for the next year when after May', () => {
      // Test with a date after May 13th
      vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
      
      const examDate = getDefaultExamDate();
      expect(examDate.getFullYear()).toBe(2025);
      expect(examDate.getMonth()).toBe(4); // May is month 4 (0-indexed)
      expect(examDate.getDate()).toBe(13);
      expect(examDate.getHours()).toBe(8);
    });
  });

}); 