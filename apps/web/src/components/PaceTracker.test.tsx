import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
  };
});

// Import the mocked functions (after vi.mock)
import {
  calculatePaceMetrics,
  formatPaceStatus,
  formatTimeRemaining,
  getEncouragementMessage,
      // @ts-expect-error – import helper for tests
    __setMockMetrics,
} from "../utils/timeTracking";

// Cast helper correctly
// @ts-expect-error – we know the helper exists via vi.mock above
const setMockMetrics = __setMockMetrics as (m: Partial<PaceMetrics>) => void;

const mockedCalculatePaceMetrics = vi.mocked(calculatePaceMetrics);
const mockedFormatPaceStatus = vi.mocked(formatPaceStatus);
const mockedFormatTimeRemaining = vi.mocked(formatTimeRemaining);
const mockedGetEncouragementMessage = vi.mocked(getEncouragementMessage);

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
};

// Reset mocks and default metrics before each test
beforeEach(() => {
  // Clear call counts but preserve implementations
  mockedCalculatePaceMetrics.mockClear();
  mockedFormatPaceStatus.mockClear();
  mockedFormatTimeRemaining.mockClear();
  mockedGetEncouragementMessage.mockClear();
  // Restore default metrics in case previous test modified them
  setMockMetrics(BASE_METRICS);
});

describe("PaceTracker Component", () => {
  describe("Basic Rendering", () => {
    it("should render the component with proper structure", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      // Check for main heading
      expect(screen.getByText("📊 Study Pace")).toBeInTheDocument();

      // Check for metric labels
      expect(screen.getByText("Lessons Remaining")).toBeInTheDocument();
      expect(screen.getByText("Target Pace")).toBeInTheDocument();
    });

    it("should display time remaining information", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📅 2w 6d until exam")).toBeInTheDocument();
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

      expect(mockedCalculatePaceMetrics).toHaveBeenCalledWith(25, 50);
    });

    it("should display lessons remaining from metrics", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      // The component should display 15 lessons remaining (from our mocked return value)
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("should display target pace per day", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      // Should display 0.8 per day (0.75 rounded to 1 decimal place)
      expect(screen.getByText("0.8 per day")).toBeInTheDocument();
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
      mockedCalculatePaceMetrics.mockReturnValue({
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
      });

      mockedFormatPaceStatus.mockReturnValue(
        "⚠️ Need to catch up! 1.7 lessons/day needed",
      );
      mockedGetEncouragementMessage.mockReturnValue(
        "✨ Ready to begin your AP Stats journey?",
      );

      render(<PaceTracker completedLessons={0} totalLessons={50} />);

      expect(screen.getByText("50")).toBeInTheDocument(); // lessons remaining
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
      mockedCalculatePaceMetrics.mockReturnValue({
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
      });

      mockedFormatPaceStatus.mockReturnValue(
        "🎯 Ahead of schedule! 0.4 lessons/day needed",
      );
      mockedFormatTimeRemaining.mockReturnValue("🔥 5 days until exam!");
      mockedGetEncouragementMessage.mockReturnValue(
        "🌟 Almost there! You've got this!",
      );

      render(<PaceTracker completedLessons={48} totalLessons={50} />);

      expect(screen.getByText("2")).toBeInTheDocument(); // lessons remaining
      expect(screen.getByText("0.4 per day")).toBeInTheDocument(); // target pace
      expect(screen.getByText("🔥 5 days until exam!")).toBeInTheDocument();
      expect(
        screen.getByText("🎯 Ahead of schedule! 0.4 lessons/day needed"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("🌟 Almost there! You've got this!"),
      ).toBeInTheDocument();
    });

    it("should handle complete progress", () => {
      // Mock return values for complete
      mockedCalculatePaceMetrics.mockReturnValue({
        daysUntilExam: 10,
        hoursUntilExam: 240,
        lessonsRemaining: 0,
        totalLessons: 50,
        completedLessons: 50,
        lessonsPerDay: 0,
        hoursPerLesson: 1.5,
        isOnTrack: true,
        paceStatus: "ahead",
        targetLessonsPerDay: 0,
        targetHoursPerDay: 0,
      });

      mockedFormatPaceStatus.mockReturnValue(
        "🎯 Ahead of schedule! 0.0 lessons/day needed",
      );
      mockedGetEncouragementMessage.mockReturnValue(
        "🌟 Almost there! You've got this!",
      );

      render(<PaceTracker completedLessons={50} totalLessons={50} />);

      expect(screen.getByText("0")).toBeInTheDocument(); // lessons remaining
      expect(screen.getByText("0.0 per day")).toBeInTheDocument(); // target pace
    });
  });

  describe("Function Call Integration", () => {
    it("should call all utility functions with correct parameters", () => {
      // Set up specific mock return for this test
      const testMetrics = {
        daysUntilExam: 10,
        hoursUntilExam: 240,
        lessonsRemaining: 0,
        totalLessons: 50,
        completedLessons: 50,
        lessonsPerDay: 0,
        hoursPerLesson: 1.5,
        isOnTrack: true,
        paceStatus: "ahead" as const,
        targetLessonsPerDay: 0,
        targetHoursPerDay: 0,
      };

      mockedCalculatePaceMetrics.mockReturnValue(testMetrics);

      render(<PaceTracker completedLessons={50} totalLessons={50} />);

      // Verify calculatePaceMetrics was called with the right props
      expect(mockedCalculatePaceMetrics).toHaveBeenCalledWith(50, 50);

      // Verify formatting functions were called with the returned metrics
      expect(mockedFormatTimeRemaining).toHaveBeenCalledWith(testMetrics);
      expect(mockedFormatPaceStatus).toHaveBeenCalledWith(testMetrics);
      expect(mockedGetEncouragementMessage).toHaveBeenCalledWith(testMetrics);
    });
  });
});
