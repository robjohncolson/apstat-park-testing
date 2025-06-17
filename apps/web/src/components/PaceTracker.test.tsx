import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders as render, setupMocks } from "../utils/test-utils";
import { PaceTracker } from "./PaceTracker";

// Mock the usePaceTracker hook
vi.mock("../hooks/usePaceTracker", () => ({
  usePaceTracker: vi.fn(),
}));

import { usePaceTracker } from "../hooks/usePaceTracker";
const mockedUsePaceTracker = vi.mocked(usePaceTracker);

const DEFAULT_HOOK_DATA = {
  metrics: {
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
  },
  formattedData: {
    paceStatus: "✅ On track! 0.8 lessons/day needed",
    encouragementMessage: "💪 Strong progress! Keep it up!",
    deadlineCountdown: "1h 0m",
    bufferStatus: "🟢 1.3 lessons ahead",
    targetPace: "0.8 per day",
  },
  isLoading: false,
  error: undefined,
};

beforeEach(() => {
  setupMocks();
  mockedUsePaceTracker.mockReturnValue(DEFAULT_HOOK_DATA);
});

describe("PaceTracker Component (Presentation Only)", () => {
  describe("Normal Rendering", () => {
    it("should render the component with proper structure", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📊 Study Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("📅 Next Lesson Deadline")).toBeInTheDocument();
      expect(screen.getByText("Lessons Remaining")).toBeInTheDocument();
      expect(screen.getByText("Target Pace")).toBeInTheDocument();
    });

    it("should display formatted data from the hook", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("1h 0m")).toBeInTheDocument();
      expect(screen.getByText("🟢 1.3 lessons ahead")).toBeInTheDocument();
      expect(screen.getByText("0.8 per day")).toBeInTheDocument();
      expect(screen.getByText("✅ On track! 0.8 lessons/day needed")).toBeInTheDocument();
      expect(screen.getByText("💪 Strong progress! Keep it up!")).toBeInTheDocument();
    });

    it("should display metrics data correctly", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("35.00")).toBeInTheDocument(); // completed lessons
      expect(screen.getByText("50")).toBeInTheDocument(); // total lessons
      expect(screen.getByText("15")).toBeInTheDocument(); // lessons remaining
      expect(screen.getByText("0.8 per day")).toBeInTheDocument(); // target pace
    });

    it("should pass correct props to the hook", () => {
      render(<PaceTracker completedLessons={42} totalLessons={89} />);

      expect(mockedUsePaceTracker).toHaveBeenCalledWith({
        completedLessons: 42,
        totalLessons: 89,
      });
    });
  });

  describe("Loading State", () => {
    it("should display loading state", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        isLoading: true,
      });

      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📊 Loading pace tracker...")).toBeInTheDocument();
      expect(screen.queryByText("📊 Study Pace Tracker")).not.toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should display error state", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        isLoading: false,
        error: "Failed to load saved progress data",
      });

      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("⚠️ Failed to load saved progress data")).toBeInTheDocument();
      expect(screen.getByText("Please refresh the page to try again")).toBeInTheDocument();
      expect(screen.queryByText("📊 Study Pace Tracker")).not.toBeInTheDocument();
    });

    it("should display custom error message", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        isLoading: false,
        error: "Storage quota exceeded",
      });

      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("⚠️ Storage quota exceeded")).toBeInTheDocument();
    });
  });

  describe("Different Data States", () => {
    it("should handle zero completed lessons", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        metrics: {
          ...DEFAULT_HOOK_DATA.metrics,
          completedLessons: 0,
          lessonsRemaining: 50,
        },
        formattedData: {
          ...DEFAULT_HOOK_DATA.formattedData,
          paceStatus: "⚠️ Need to catch up! 1.7 lessons/day needed",
          encouragementMessage: "🎯 Ready to begin your AP Statistics journey!",
        },
      });

      render(<PaceTracker completedLessons={0} totalLessons={50} />);

      expect(screen.getByText("0.00")).toBeInTheDocument(); // completed lessons
      expect(screen.getByText("50")).toBeInTheDocument(); // lessons remaining
      expect(screen.getByText("⚠️ Need to catch up! 1.7 lessons/day needed")).toBeInTheDocument();
      expect(screen.getByText("🎯 Ready to begin your AP Statistics journey!")).toBeInTheDocument();
    });

    it("should handle completed progress", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        metrics: {
          ...DEFAULT_HOOK_DATA.metrics,
          completedLessons: 50,
          lessonsRemaining: 0,
          targetLessonsPerDay: 0,
        },
        formattedData: {
          ...DEFAULT_HOOK_DATA.formattedData,
          paceStatus: "🎯 10.0 lessons ahead!",
          encouragementMessage: "🎉 All lessons complete! Amazing work!",
          targetPace: "All lessons complete! 🎉",
        },
      });

      render(<PaceTracker completedLessons={50} totalLessons={50} />);

      expect(screen.getByText("50.00")).toBeInTheDocument(); // completed lessons
      expect(screen.getByText("0")).toBeInTheDocument(); // lessons remaining
      expect(screen.getByText("0.0 per day")).toBeInTheDocument(); // target pace
      expect(screen.getByText("🎯 10.0 lessons ahead!")).toBeInTheDocument();
      expect(screen.getByText("🎉 All lessons complete! Amazing work!")).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should apply custom className", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} className="custom-class" />);

      const paceTracker = screen.getByText("📊 Study Pace Tracker").closest(".pace-tracker");
      expect(paceTracker).toHaveClass("custom-class");
    });
  });
});
