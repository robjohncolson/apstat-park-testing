import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePaceTracker } from "./usePaceTracker";
import * as timeTracking from "../utils/timeTracking";

// Mock the timeTracking module
vi.mock("../utils/timeTracking", () => ({
  calculatePaceMetrics: vi.fn(),
  formatPaceStatus: vi.fn(),
  getEncouragementMessage: vi.fn(),
  formatDeadlineCountdown: vi.fn(),
  formatBufferStatus: vi.fn(),
  formatTargetPace: vi.fn(),
}));

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: { id: "test-user-123" } })),
}));

const mockTimeTracking = vi.mocked(timeTracking);

const DEFAULT_METRICS = {
  daysUntilExam: 20,
  hoursUntilExam: 480,
  lessonsRemaining: 15,
  totalLessons: 50,
  completedLessons: 35,
  lessonsPerDay: 0,
  hoursPerLesson: 1.5,
  isOnTrack: true,
  paceStatus: "on-track" as const,
  targetLessonsPerDay: 0.75,
  targetHoursPerDay: 1.125,
  nextDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
  bufferHours: 2,
  aheadLessons: 1.3,
};

describe("usePaceTracker Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Set up default mock returns
    mockTimeTracking.calculatePaceMetrics.mockReturnValue(DEFAULT_METRICS);
    mockTimeTracking.formatPaceStatus.mockReturnValue("✅ On track!");
    mockTimeTracking.getEncouragementMessage.mockReturnValue("💪 Keep it up!");
    mockTimeTracking.formatDeadlineCountdown.mockReturnValue("1h 30m");
    mockTimeTracking.formatBufferStatus.mockReturnValue("🟢 1.3 lessons ahead");
    mockTimeTracking.formatTargetPace.mockReturnValue("0.8 per day");
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Initialization", () => {
    it("should initialize with loading state", () => {
      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 50 })
      );

      expect(result.current.isLoading).toBe(true);
    });

    it("should load data from localStorage with user-specific keys", async () => {
      // Pre-populate localStorage with user-specific data
      localStorage.setItem("apstat_pace_deadline_test-user-123", "2024-05-01T10:00:00.000Z");
      localStorage.setItem("apstat_pace_buffer_test-user-123", "5.5");

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 50 })
      );

      // Wait for loading to complete
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error("Storage access denied");
      });

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 50 })
      );

      expect(result.current.error).toBe("Failed to load saved progress data");
      
      // Restore localStorage
      localStorage.getItem = originalGetItem;
    });
  });

  describe("Data Formatting", () => {
    it("should return formatted data for display", () => {
      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 50 })
      );

      expect(result.current.formattedData).toEqual({
        paceStatus: "✅ On track!",
        encouragementMessage: "💪 Keep it up!",
        deadlineCountdown: "1h 30m",
        bufferStatus: "🟢 1.3 lessons ahead",
        targetPace: "0.8 per day",
      });
    });

    it("should pass correct parameters to calculatePaceMetrics", () => {
      renderHook(() => 
        usePaceTracker({ completedLessons: 10, totalLessons: 89 })
      );

      expect(mockTimeTracking.calculatePaceMetrics).toHaveBeenCalledWith(
        10,
        89,
        undefined,
        expect.any(Date),
        0, // Initial buffer
        undefined // Initial deadline
      );
    });
  });

  describe("Timer Updates", () => {
    it("should update time periodically", () => {
      vi.useFakeTimers();
      
      renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 50 })
      );

      const initialCallCount = mockTimeTracking.calculatePaceMetrics.mock.calls.length;

      // Advance time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockTimeTracking.calculatePaceMetrics.mock.calls.length).toBeGreaterThan(initialCallCount);
      
      vi.useRealTimers();
    });
  });

  describe("LocalStorage Persistence", () => {
    it("should save data to localStorage with user-specific keys", () => {
      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 50 })
      );

      // Trigger a state change that should persist
      // This would happen through normal usage
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "apstat_pace_buffer_test-user-123",
        "0"
      );
    });

    it("should handle localStorage write errors gracefully", () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage quota exceeded");
      });

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 50 })
      );

      // Should not crash and should set error state
      expect(result.current.error).toBe("Failed to save progress data");
      
      // Restore localStorage
      localStorage.setItem = originalSetItem;
    });
  });

  describe("Props Changes", () => {
    it("should update metrics when completedLessons changes", () => {
      const { result, rerender } = renderHook(
        ({ completedLessons, totalLessons }) => 
          usePaceTracker({ completedLessons, totalLessons }),
        {
          initialProps: { completedLessons: 10, totalLessons: 50 }
        }
      );

      mockTimeTracking.calculatePaceMetrics.mockClear();

      rerender({ completedLessons: 11, totalLessons: 50 });

      expect(mockTimeTracking.calculatePaceMetrics).toHaveBeenCalledWith(
        11,
        50,
        undefined,
        expect.any(Date),
        expect.any(Number),
        undefined
      );
    });
  });
}); 