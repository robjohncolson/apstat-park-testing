import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  calculatePaceMetrics, 
  getDefaultExamDate,
  formatDeadlineCountdown,
  formatBufferStatus,
  formatTargetPace,
  formatPaceStatus,
  formatTimeRemaining,
  getEncouragementMessage 
} from './timeTracking';

// Mock dates for deterministic testing
const MOCK_CURRENT_DATE = new Date('2024-01-15T10:00:00Z');
const MOCK_EXAM_DATE = new Date('2024-05-13T16:00:00Z'); // May 13, 4pm

describe('timeTracking Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_CURRENT_DATE);
  });

  describe('calculatePaceMetrics (Phase 2 Logic)', () => {
    it('should calculate basic metrics correctly with zero progress', () => {
      const metrics = calculatePaceMetrics(0, 89, MOCK_EXAM_DATE, MOCK_CURRENT_DATE, 0);
      
      expect(metrics.completedLessons).toBe(0);
      expect(metrics.totalLessons).toBe(89);
      expect(metrics.lessonsRemaining).toBe(89);
      expect(metrics.hoursUntilExam).toBeCloseTo(2862, 0); // ~119 days
      expect(metrics.hoursPerLesson).toBeCloseTo(2862 / 89, 1); // ~32.15
      expect(metrics.bufferHours).toBe(0);
      expect(metrics.aheadLessons).toBe(0);
    });
    
    it('should set pace status to "ahead" when buffer is positive', () => {
      const bufferHours = 48; // 2 days ahead of pace
      const metrics = calculatePaceMetrics(10, 89, MOCK_EXAM_DATE, MOCK_CURRENT_DATE, bufferHours);

      expect(metrics.paceStatus).toBe('ahead');
      expect(metrics.isOnTrack).toBe(true);
      expect(metrics.aheadLessons).toBeGreaterThan(1.0);
    });

    it('should set pace status to "on-track" when buffer is neutral or slightly negative', () => {
      const metrics = calculatePaceMetrics(10, 89, MOCK_EXAM_DATE, MOCK_CURRENT_DATE, 0);
      expect(metrics.paceStatus).toBe('on-track');
      expect(metrics.isOnTrack).toBe(true);
      expect(metrics.aheadLessons).toBe(0);
    });

    it('should set pace status to "behind" when buffer is significantly negative', () => {
      const bufferHours = -48; // 2 days behind pace
      const metrics = calculatePaceMetrics(10, 89, MOCK_EXAM_DATE, MOCK_CURRENT_DATE, bufferHours);

      expect(metrics.paceStatus).toBe('behind');
      expect(metrics.isOnTrack).toBe(false);
      expect(metrics.aheadLessons).toBeLessThan(-0.5);
    });

    it('should handle all lessons completed', () => {
      const metrics = calculatePaceMetrics(89, 89, MOCK_EXAM_DATE, MOCK_CURRENT_DATE, 0);
      
      expect(metrics.lessonsRemaining).toBe(0);
      expect(metrics.hoursPerLesson).toBe(0);
      expect(metrics.nextDeadline).toEqual(MOCK_EXAM_DATE);
    });

    it('should calculate next deadline correctly with zero buffer', () => {
      const metrics = calculatePaceMetrics(10, 89, MOCK_EXAM_DATE, MOCK_CURRENT_DATE, 0);
      const expectedDeadline = new Date(MOCK_CURRENT_DATE.getTime() + (metrics.hoursPerLesson * 60 * 60 * 1000));
      expect(metrics.nextDeadline.getTime()).toBeCloseTo(expectedDeadline.getTime());
    });

    it('should apply a positive buffer to make the deadline later', () => {
      const bufferHours = 12; // 12 hours ahead
      const metrics = calculatePaceMetrics(10, 89, MOCK_EXAM_DATE, MOCK_CURRENT_DATE, bufferHours);
      
      const expectedDeadlineWithBuffer = new Date(
        MOCK_CURRENT_DATE.getTime() 
        + (metrics.hoursPerLesson * 60 * 60 * 1000) 
        + (bufferHours * 60 * 60 * 1000) // Note: ADDING buffer
      );
      expect(metrics.nextDeadline.getTime()).toBeCloseTo(expectedDeadlineWithBuffer.getTime());
    });
  });

  describe('formatTimeRemaining', () => {
    it('should format weeks and days correctly', () => {
      const metrics = { daysUntilExam: 15 } as any;
      expect(formatTimeRemaining(metrics)).toBe('2w 1d until exam');
    });

    it('should format exact weeks correctly', () => {
      const metrics = { daysUntilExam: 14 } as any;
      expect(formatTimeRemaining(metrics)).toBe('2w until exam');
    });

    it('should show a special message for the last 7 days', () => {
      const metrics = { daysUntilExam: 3 } as any;
      expect(formatTimeRemaining(metrics)).toBe('⚡ Final countdown: 3 days!');
    });

    it('should show special message for 1 day remaining', () => {
      const metrics = { daysUntilExam: 1 } as any;
      expect(formatTimeRemaining(metrics)).toBe('🔥 EXAM TOMORROW!');
    });

    it('should show "Exam day!" when 0 days are left', () => {
      const metrics = { daysUntilExam: 0 } as any;
      expect(formatTimeRemaining(metrics)).toBe('📚 EXAM DAY!');
    });

    it('should format weeks properly for 15 days (2w 1d)', () => {
      const metrics = { daysUntilExam: 15 } as any;
      expect(formatTimeRemaining(metrics)).toBe('2w 1d until exam');
    });
  });

  describe('formatPaceStatus (Phase 2 Logic)', () => {
    it('should format ahead status correctly', () => {
      const metrics = { paceStatus: 'ahead', aheadLessons: 2.3 } as any;
      expect(formatPaceStatus(metrics)).toBe('🎯 2.3 lessons ahead!');
    });

    it('should format on-track status correctly', () => {
      const metrics = { paceStatus: 'on-track', targetLessonsPerDay: 1.5 } as any;
      expect(formatPaceStatus(metrics)).toBe('✅ On track! 1.5 lessons/day needed');
    });

    it('should format behind status correctly', () => {
      const metrics = { paceStatus: 'behind', aheadLessons: -1.8 } as any;
      expect(formatPaceStatus(metrics)).toBe('⚠️ 1.8 lessons behind!');
    });

    it('should format unknown status correctly', () => {
      const metrics = { paceStatus: 'unknown' } as any;
      expect(formatPaceStatus(metrics)).toBe('📊 Calculating pace...');
    });
  });

  describe('getEncouragementMessage', () => {
    it('should return correct message for 90%+ completion', () => {
      expect(getEncouragementMessage(0.95)).toBe("🎉 Almost there! You're in the final stretch!");
    });

    it('should return correct message for 75%+ completion', () => {
      expect(getEncouragementMessage(0.80)).toBe("💪 Great progress! Keep up the momentum!");
    });

    it('should return correct message for 50%+ completion', () => {
      expect(getEncouragementMessage(0.60)).toBe("🚀 Halfway there! You're building solid foundations!");
    });

    it('should return correct message for 25%+ completion', () => {
      expect(getEncouragementMessage(0.30)).toBe("📈 Good start! Every lesson counts!");
    });

    it('should return correct message for low but non-zero completion', () => {
      expect(getEncouragementMessage(0.05)).toBe("🌱 Just getting started! The journey begins with a single step!");
    });

    it('should return correct message for zero completion', () => {
      expect(getEncouragementMessage(0)).toBe("🎯 Ready to begin your AP Statistics journey!");
    });
  });

  describe('getDefaultExamDate', () => {
    it('should return May 13th for the current year when before May', () => {
      const examDate = getDefaultExamDate();
      expect(examDate.getMonth()).toBe(4); // May is month 4 (0-indexed)
      expect(examDate.getDate()).toBe(13);
    });

    it('should return May 13th for the next year when after May', () => {
      // Mock a date after May
      vi.setSystemTime(new Date('2024-06-01T10:00:00Z'));
      const examDate = getDefaultExamDate();
      expect(examDate.getMonth()).toBe(4); // May is month 4 (0-indexed)
      expect(examDate.getDate()).toBe(13);
      expect(examDate.getFullYear()).toBe(2025); // Should be next year
    });
  });

  describe('New Formatting Functions', () => {
    describe('formatDeadlineCountdown', () => {
      it('should format countdown correctly', () => {
        const deadline = new Date(MOCK_CURRENT_DATE.getTime() + (3 * 3600 * 1000) + (45 * 60 * 1000) + (30 * 1000));
        const result = formatDeadlineCountdown(deadline, MOCK_CURRENT_DATE);
        expect(result).toBe('03:45:30');
      });

      it('should handle passed deadlines', () => {
        const deadline = new Date(MOCK_CURRENT_DATE.getTime() - 1000); // 1 second ago
        const result = formatDeadlineCountdown(deadline, MOCK_CURRENT_DATE);
        expect(result).toBe('⏰ Deadline passed!');
      });

      it('should pad single digits correctly', () => {
        const deadline = new Date(MOCK_CURRENT_DATE.getTime() + (1 * 3600 * 1000) + (5 * 60 * 1000) + (9 * 1000));
        const result = formatDeadlineCountdown(deadline, MOCK_CURRENT_DATE);
        expect(result).toBe('01:05:09');
      });
    });

    describe('formatBufferStatus', () => {
      it('should format positive buffer correctly', () => {
        const metrics = { aheadLessons: 2.3 } as any;
        expect(formatBufferStatus(metrics)).toBe('🟢 2.3 lessons ahead');
      });

      it('should format negative buffer correctly', () => {
        const metrics = { aheadLessons: -1.7 } as any;
        expect(formatBufferStatus(metrics)).toBe('🔴 1.7 lessons behind');
      });

      it('should format zero buffer correctly', () => {
        const metrics = { aheadLessons: 0 } as any;
        expect(formatBufferStatus(metrics)).toBe('⚪ On pace');
      });
    });

    describe('formatTargetPace', () => {
      it('should format high pace normally', () => {
        expect(formatTargetPace(2.5)).toBe('2.5 lessons/day');
        expect(formatTargetPace(1.0)).toBe('1.0 lessons/day');
      });

      it('should format low pace as "every X days"', () => {
        expect(formatTargetPace(0.5)).toBe('≈ 1 lesson every 2 days');
        expect(formatTargetPace(0.33)).toBe('≈ 1 lesson every 3 days');
        expect(formatTargetPace(0.25)).toBe('≈ 1 lesson every 4 days');
      });

      it('should handle zero pace', () => {
        expect(formatTargetPace(0)).toBe('All lessons complete! 🎉');
      });
    });
  });
}); 