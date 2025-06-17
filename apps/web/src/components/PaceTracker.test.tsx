import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders as render, setupMocks } from "../utils/test-utils";
import { PaceTracker } from "./PaceTracker";

// Mock the usePaceTracker hook
vi.mock("../hooks/usePaceTracker", () => ({
  usePaceTracker: vi.fn(),
}));

// Mock the AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { usePaceTracker } from "../hooks/usePaceTracker";
import { useAuth } from "../context/AuthContext";

const mockedUsePaceTracker = vi.mocked(usePaceTracker);
const mockedUseAuth = vi.mocked(useAuth);

const DEFAULT_HOOK_DATA = {
  paceData: {
    userId: 123,
    currentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    bufferHours: 5.5,
    lastCompletedLessons: 35,
    lastLessonCompletion: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    examDate: new Date(2024, 4, 13, 8, 0, 0).toISOString(),
    updatedAt: new Date().toISOString(),
    wasLessonCompleted: false,
  },
  metrics: {
    daysUntilExam: 20,
    hoursUntilExam: 480,
    lessonsRemaining: 15,
    totalLessons: 50,
    completedLessons: 35,
    lessonsPerDay: 1.2,
    hoursPerLesson: 1.5,
    isOnTrack: true,
    paceStatus: "on-track" as const,
    targetLessonsPerDay: 0.75,
    targetHoursPerDay: 1.125,
    nextDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    bufferHours: 5.5,
    aheadLessons: 1.3,
  },
  isLoading: false,
  isError: false,
  error: null,
  updatePace: vi.fn(),
  isUpdating: false,
  updateError: null,
  isDisabled: false,
  currentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
  bufferHours: 5.5,
  hoursUntilDeadline: 24,
  isOverdue: false,
};

beforeEach(() => {
  setupMocks();
  vi.clearAllMocks();
  
  // Mock authenticated user by default
  mockedUseAuth.mockReturnValue({
    user: { id: 123, username: "test-user" },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  });
  
  mockedUsePaceTracker.mockReturnValue(DEFAULT_HOOK_DATA);
});

describe("PaceTracker Component", () => {
  describe("Authenticated User - Normal Rendering", () => {
    it("should render the component with proper structure", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("35.0 / 50 lessons")).toBeInTheDocument();
      expect(screen.getByText("Days until exam:")).toBeInTheDocument();
      expect(screen.getByText("Lessons remaining:")).toBeInTheDocument();
      expect(screen.getByText("Target pace:")).toBeInTheDocument();
    });

    it("should display progress metrics correctly", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("20")).toBeInTheDocument(); // days until exam
      expect(screen.getByText("15")).toBeInTheDocument(); // lessons remaining
      expect(screen.getByText("0.75 lessons/day")).toBeInTheDocument(); // target pace
      expect(screen.getByText("70.0%")).toBeInTheDocument(); // completion percentage
    });

    it("should show user tracking info", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📝 Tracking progress for test-user")).toBeInTheDocument();
    });

    it("should pass correct props to the hook", () => {
      render(<PaceTracker completedLessons={42} totalLessons={89} />);

      expect(mockedUsePaceTracker).toHaveBeenCalledWith({
        completedLessons: 42,
        totalLessons: 89,
        examDate: undefined,
        enabled: true,
      });
    });
  });

  describe("Unauthenticated User - Disabled State", () => {
    beforeEach(() => {
      // Mock unauthenticated user
      mockedUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      // Mock disabled hook state
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        isDisabled: true,
        isLoading: false,
        paceData: undefined,
        metrics: undefined,
      });
    });

    it("should show disabled state for unauthenticated users", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("Disabled")).toBeInTheDocument();
      expect(screen.getByText("🔐 Please log in to track your pace")).toBeInTheDocument();
      expect(screen.getByText("Pace tracking helps you stay on schedule for the AP Statistics exam")).toBeInTheDocument();
    });

    it("should not show metrics when disabled", () => {
      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.queryByText("Days until exam:")).not.toBeInTheDocument();
      expect(screen.queryByText("Lessons remaining:")).not.toBeInTheDocument();
      expect(screen.queryByText("Target pace:")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should display loading state", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        isLoading: true,
        paceData: undefined,
        metrics: undefined,
      });

      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByText("Loading your pace data...")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should display API error state", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        isLoading: false,
        isError: true,
        error: new Error("Failed to fetch pace data: Internal Server Error"),
        paceData: undefined,
        metrics: undefined,
      });

      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("⚠️ Unable to load pace data")).toBeInTheDocument();
      expect(screen.getByText("Please check your connection and try refreshing the page")).toBeInTheDocument();
    });

    it("should display backend offline error state", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        isLoading: false,
        isError: true,
        error: new Error("Backend API is not running. Please start the API server or use offline mode."),
        paceData: undefined,
        metrics: undefined,
      });

      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("Backend Offline")).toBeInTheDocument();
      expect(screen.getByText("🔌 Backend API is offline")).toBeInTheDocument();
      expect(screen.getByText("cd apps/api && npm run dev")).toBeInTheDocument();
    });
  });

  describe("Different Pace Status States", () => {
    it("should handle 'ahead' pace status", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        metrics: {
          ...DEFAULT_HOOK_DATA.metrics!,
          paceStatus: "ahead",
          aheadLessons: 2.5,
        },
      });

      render(<PaceTracker completedLessons={40} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("Ahead")).toBeInTheDocument();
    });

    it("should handle 'behind' pace status", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        metrics: {
          ...DEFAULT_HOOK_DATA.metrics!,
          paceStatus: "behind",
          aheadLessons: -1.2,
        },
      });

      render(<PaceTracker completedLessons={20} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("Behind")).toBeInTheDocument();
    });

    it("should handle overdue status", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        isOverdue: true,
        metrics: {
          ...DEFAULT_HOOK_DATA.metrics!,
          paceStatus: "behind",
        },
      });

      render(<PaceTracker completedLessons={15} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("Overdue")).toBeInTheDocument();
    });
  });

  describe("Progress Completion States", () => {
    it("should handle zero completed lessons", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        metrics: {
          ...DEFAULT_HOOK_DATA.metrics!,
          completedLessons: 0,
          lessonsRemaining: 50,
        },
      });

      render(<PaceTracker completedLessons={0} totalLessons={50} />);

      expect(screen.getByText("0.0 / 50 lessons")).toBeInTheDocument();
      expect(screen.getByText("0.0%")).toBeInTheDocument();
      expect(screen.getByText("🌟 Every lesson gets you closer to success!")).toBeInTheDocument();
    });

    it("should handle completed progress", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        metrics: {
          ...DEFAULT_HOOK_DATA.metrics!,
          completedLessons: 50,
          lessonsRemaining: 0,
          targetLessonsPerDay: 0,
        },
      });

      render(<PaceTracker completedLessons={50} totalLessons={50} />);

      expect(screen.getByText("50.0 / 50 lessons")).toBeInTheDocument();
      expect(screen.getByText("100.0%")).toBeInTheDocument();
      expect(screen.getByText("🎉 Almost there! You're doing great!")).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should apply custom className", () => {
      const { container } = render(<PaceTracker completedLessons={35} totalLessons={50} className="custom-class" />);

      const paceTracker = container.querySelector('.paceTracker');
      expect(paceTracker).toHaveClass("custom-class");
    });
  });

  describe("No Data State", () => {
    it("should handle missing metrics data", () => {
      mockedUsePaceTracker.mockReturnValue({
        ...DEFAULT_HOOK_DATA,
        metrics: undefined,
        paceData: {
          ...DEFAULT_HOOK_DATA.paceData!,
        },
      });

      render(<PaceTracker completedLessons={35} totalLessons={50} />);

      expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
      expect(screen.getByText("No Data")).toBeInTheDocument();
      expect(screen.getByText("📈 Start completing lessons to track your pace!")).toBeInTheDocument();
    });
  });
});
