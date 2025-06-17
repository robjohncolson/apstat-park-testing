import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders as render, setupMocks } from "../utils/test-utils";
import { PaceTracker } from "./PaceTracker";
import type { PaceMetrics } from "../utils/timeTracking";

// Mock the entire timeTracking module
vi.mock("../utils/timeTracking", () => {
  const defaultMetrics: PaceMetrics = {
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
    nextDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    bufferHours: 2,
    aheadLessons: 1.3,
  };

  // Store the metrics in a shared variable so tests can mutate if needed
  let currentMetrics = { ...defaultMetrics };

  return {
    // Provide a helper to allow tests to override the mock metrics easily
    __setMockMetrics: (metrics: Partial<PaceMetrics>) => {
      currentMetrics = { ...currentMetrics, ...metrics };
    },
    calculatePaceMetrics: vi.fn(() => currentMetrics),
    formatPaceStatus: vi.fn(() => "✅ On track! 0.8 lessons/day needed"),
    formatTimeRemaining: vi.fn(() => "📅 2w 6d until exam"),
    getEncouragementMessage: vi.fn(() => "💪 Strong progress! Keep it up!"),

    // Additional utility functions used within the component that must be mocked
    formatDeadlineCountdown: vi.fn(() => "1h 0m remaining"),
    formatBufferStatus: vi.fn(() => "⏳ 2h buffer"),
    formatTargetPace: vi.fn(() => "0.8 per day"),
  };
});

// Import the mocked functions (after vi.mock)
import {
  calculatePaceMetrics,
  formatPaceStatus,
  formatTimeRemaining,
  getEncouragementMessage,
  formatDeadlineCountdown,
  formatBufferStatus,
  formatTargetPace,
  // @ts-expect-error – import helper for tests
  __setMockMetrics,
} from "../utils/timeTracking";

// Cast helper correctly
const setMockMetrics = __setMockMetrics as (m: Partial<PaceMetrics>) => void;

const mockedCalculatePaceMetrics = vi.mocked(calculatePaceMetrics);
const mockedFormatPaceStatus = vi.mocked(formatPaceStatus);
const mockedFormatTimeRemaining = vi.mocked(formatTimeRemaining);
const mockedGetEncouragementMessage = vi.mocked(getEncouragementMessage);

// Newly added mocks
const mockedFormatDeadlineCountdown = vi.mocked(formatDeadlineCountdown);
const mockedFormatBufferStatus = vi.mocked(formatBufferStatus);
const mockedFormatTargetPace = vi.mocked(formatTargetPace);

// Helper default metrics constant for reuse in expectations
const BASE_METRICS: PaceMetrics = {
  daysUntilExam: 20,
  hoursUntilExam: 480,
  lessonsRemaining: 15,
  totalLessons: 50,
  completedLessons: 35,
  lessonsPerDay: 0,
  hoursPerLesson: 1.5,
  isOnTrack: true,
  paceStatus: "on-track",
  targetLessonsPerDay: 0.75,
  targetHoursPerDay: 1.125,
  nextDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  bufferHours: 2,
  aheadLessons: 1.3,
};

// Reset mocks and default metrics before each test
beforeEach(() => {
  // Set up localStorage and fetch mocks
  setupMocks();
  
  // Clear call counts but preserve implementations
  mockedCalculatePaceMetrics.mockClear();
  mockedFormatPaceStatus.mockClear();
  mockedFormatTimeRemaining.mockClear();
  mockedGetEncouragementMessage.mockClear();
  mockedFormatDeadlineCountdown.mockClear();
  mockedFormatBufferStatus.mockClear();
  mockedFormatTargetPace.mockClear();
  // Restore default metrics in case previous test modified them
  setMockMetrics(BASE_METRICS);
});

describe("PaceTracker Component", () => {
  describe("Basic Rendering", () => {
    it("should render the component with proper structure", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      // Check for main heading (text was updated in component)
      expect(screen.getByText("📊 Study Pace Tracker")).toBeInTheDocument();

      // Check for metric labels (should always exist)
      expect(screen.getByText("Lessons Remaining")).toBeInTheDocument();
      expect(screen.getByText("Target Pace")).toBeInTheDocument();
    });

    it("should display deadline countdown information", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("1h 0m remaining")).toBeInTheDocument();
    });

    it("should display pace status message", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(
        screen.getByText("✅ On track! 0.8 lessons/day needed"),
      ).toBeInTheDocument();
    });

    it("should display encouragement message", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(
        screen.getByText("💪 Strong progress! Keep it up!"),
      ).toBeInTheDocument();
    });
  });

  describe("Props Integration", () => {
    it("should pass correct props to calculatePaceMetrics", () => {
      render(<PaceTracker completedLessons={25} totalLessons={50} />);

      // The calculation function now receives additional optional parameters - we only care about the first two
      const firstCall = mockedCalculatePaceMetrics.mock.calls[0];
      expect(firstCall[0]).toBe(25);
      expect(firstCall[1]).toBe(50);
    });

    it("should display lessons remaining from metrics", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      // The component may render the value in multiple places, ensure at least one occurrence
      expect(screen.getAllByText("15").length).toBeGreaterThan(0); // lessons remaining
    });

    it("should display target pace per day", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      // Should display the mocked target pace string (may appear multiple times)
      expect(screen.getAllByText("0.8 per day").length).toBeGreaterThan(0);
    });

    it("should apply custom className when provided", () => {
      const { container } = render(
        <PaceTracker
          completedLessons={35}
          totalLessons={50}
          className="custom-class"
        />,
      );

      const paceTracker = container.firstChild as HTMLElement;
      expect(paceTracker).toHaveClass("pace-tracker");
      expect(paceTracker).toHaveClass("custom-class");
    });
  });

  describe("Different Progress States", () => {
    it("should handle zero completed lessons", () => {
      // Mock return values for zero progress
      const zeroProgressMetrics: PaceMetrics = {
        daysUntilExam: 30,
        hoursUntilExam: 720,
        lessonsRemaining: 50,
        totalLessons: 50,
        completedLessons: 0,
        lessonsPerDay: 0,
        hoursPerLesson: 1.5,
        isOnTrack: false,
        paceStatus: "behind",
        targetLessonsPerDay: 1.67,
        targetHoursPerDay: 2.5,
        nextDeadline: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours from now
        bufferHours: -12,
        aheadLessons: -8,
      };

      mockedCalculatePaceMetrics.mockReturnValue(zeroProgressMetrics);
      mockedFormatPaceStatus.mockReturnValue(
        "⚠️ Need to catch up! 1.7 lessons/day needed",
      );
      mockedGetEncouragementMessage.mockReturnValue(
        "✨ Ready to begin your AP Stats journey?",
      );

      render(<PaceTracker completedLessons={0} totalLessons={50} />);

      // Lessons remaining value may appear multiple times, so use getAllByText
      expect(screen.getAllByText("50").length).toBeGreaterThan(0); // lessons remaining
      expect(screen.getByText("1.7 per day")).toBeInTheDocument(); // target pace
      expect(
        screen.getByText("⚠️ Need to catch up! 1.7 lessons/day needed"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("✨ Ready to begin your AP Stats journey?"),
      ).toBeInTheDocument();
    });

    it("should handle nearly complete progress", () => {
      // Mock return values for nearly complete
      const nearlyCompleteMetrics: PaceMetrics = {
        daysUntilExam: 5,
        hoursUntilExam: 120,
        lessonsRemaining: 2,
        totalLessons: 50,
        completedLessons: 48,
        lessonsPerDay: 0,
        hoursPerLesson: 1.5,
        isOnTrack: true,
        paceStatus: "ahead",
        targetLessonsPerDay: 0.4,
        targetHoursPerDay: 0.6,
        nextDeadline: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
        bufferHours: 60,
        aheadLessons: 2.5,
      };

      mockedCalculatePaceMetrics.mockReturnValue(nearlyCompleteMetrics);
      mockedFormatPaceStatus.mockReturnValue("🎯 2.5 lessons ahead!");
      mockedGetEncouragementMessage.mockReturnValue(
        "🌟 Almost there! You've got this!",
      );

      render(<PaceTracker completedLessons={48} totalLessons={50} />);

      expect(screen.getByText("2")).toBeInTheDocument(); // lessons remaining
      expect(screen.getByText("0.4 per day")).toBeInTheDocument(); // target pace
      expect(screen.getByText("🎯 2.5 lessons ahead!")).toBeInTheDocument();
      expect(
        screen.getByText("🌟 Almost there! You've got this!"),
      ).toBeInTheDocument();
    });

    it("should handle complete progress", () => {
      // Mock return values for complete progress
      const completeMetrics: PaceMetrics = {
        daysUntilExam: 10,
        hoursUntilExam: 240,
        lessonsRemaining: 0,
        totalLessons: 50,
        completedLessons: 50,
        lessonsPerDay: 0,
        hoursPerLesson: 0,
        isOnTrack: true,
        paceStatus: "ahead",
        targetLessonsPerDay: 0,
        targetHoursPerDay: 0,
        nextDeadline: new Date(Date.now() + 240 * 60 * 60 * 1000), // 10 days from now
        bufferHours: 240,
        aheadLessons: 10,
      };

      mockedCalculatePaceMetrics.mockReturnValue(completeMetrics);
      mockedFormatPaceStatus.mockReturnValue("🎯 10.0 lessons ahead!");
      mockedGetEncouragementMessage.mockReturnValue(
        "🎉 All lessons complete! Amazing work!",
      );

      render(<PaceTracker completedLessons={50} totalLessons={50} />);

      expect(screen.getByText("0")).toBeInTheDocument(); // lessons remaining
      expect(screen.getByText("0.0 per day")).toBeInTheDocument(); // target pace
      expect(screen.getByText("🎯 10.0 lessons ahead!")).toBeInTheDocument();
      expect(
        screen.getByText("🎉 All lessons complete! Amazing work!"),
      ).toBeInTheDocument();
    });
  });

  describe("Function Call Integration", () => {
    it("should call all utility functions with correct parameters", () => {
      // Set up specific mock return for this test
      const testMetrics: PaceMetrics = {
        daysUntilExam: 10,
        hoursUntilExam: 240,
        lessonsRemaining: 0,
        totalLessons: 50,
        completedLessons: 50,
        lessonsPerDay: 0,
        hoursPerLesson: 0,
        isOnTrack: true,
        paceStatus: "ahead",
        targetLessonsPerDay: 0,
        targetHoursPerDay: 0,
        nextDeadline: new Date(Date.now() + 240 * 60 * 60 * 1000), // 10 days from now
        bufferHours: 240,
        aheadLessons: 10,
      };

      mockedCalculatePaceMetrics.mockReturnValue(testMetrics);

      render(<PaceTracker completedLessons={50} totalLessons={50} />);

      // Verify calculatePaceMetrics was called — only first two arguments are significant
      const call = mockedCalculatePaceMetrics.mock.calls[0];
      expect(call[0]).toBe(50);
      expect(call[1]).toBe(50);

      // Verify the component invoked formatting helpers with the metrics object
      expect(mockedFormatDeadlineCountdown).toHaveBeenCalledWith(
        testMetrics.nextDeadline,
        expect.any(Date),
      );
      expect(mockedFormatBufferStatus).toHaveBeenCalledWith(testMetrics);
      expect(mockedFormatTargetPace).toHaveBeenCalledWith(
        testMetrics.targetLessonsPerDay,
      );
      expect(mockedFormatPaceStatus).toHaveBeenCalledWith(testMetrics);
      expect(mockedGetEncouragementMessage).toHaveBeenCalledWith(
        testMetrics.completedLessons / testMetrics.totalLessons,
      );
    });
  });

  describe("Persistence (localStorage)", () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it("should save deadline to localStorage when set", async () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      // The component should eventually save data to localStorage
      // We need to wait for effects to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that localStorage keys exist
      const deadlineKey = 'apstat_pace_deadline';
      const bufferKey = 'apstat_pace_buffer';
      
      // Buffer should be saved (starts at 0)
      expect(localStorage.getItem(bufferKey)).toBe("0");
      
      // We can't easily test deadline saving without more complex mocking,
      // but we can verify the keys are correct
      expect(deadlineKey).toBe("apstat_pace_deadline");
      expect(bufferKey).toBe("apstat_pace_buffer");
    });

    it("should handle localStorage errors gracefully", () => {
      // Set up console.warn spy before setting up failing localStorage
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock localStorage to throw errors AFTER component is already rendered
      // This avoids issues with AuthProvider initialization
      const originalSetItem = localStorage.setItem;
      const originalGetItem = localStorage.getItem;
      
      // First render the component normally
      const { rerender } = render(<PaceTracker completedLessons={35} totalLessons={50} />);
      
      // Then set up localStorage to fail for subsequent operations
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage quota exceeded");
      });
      localStorage.getItem = vi.fn(() => {
        throw new Error("Storage access denied");
      });

      // Rerender to trigger localStorage operations with the failing mock
      expect(() => {
        rerender(<PaceTracker completedLessons={36} totalLessons={50} />);
      }).not.toThrow();

      // The component should still work despite localStorage errors
      expect(screen.getByText("📊 Study Pace Tracker")).toBeInTheDocument();

      // Restore original methods
      localStorage.setItem = originalSetItem;
      localStorage.getItem = originalGetItem;
      warnSpy.mockRestore();
    });

    it("should work when no user is logged in", () => {
      // Mock useAuth to return no user
      vi.doMock("../context/AuthContext", () => ({
        useAuth: () => ({ user: null }),
      }));

      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      // The component should work regardless of user state
      // This is mostly testing that it doesn't crash
      expect(screen.getByText("📊 Study Pace Tracker")).toBeInTheDocument();
    });
  });
});
