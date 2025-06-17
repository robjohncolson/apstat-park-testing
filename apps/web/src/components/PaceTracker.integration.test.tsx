import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { renderWithProviders as render } from "../utils/test-utils";
import { screen } from "@testing-library/react";
import { PaceTracker } from "./PaceTracker";

// Freeze time for deterministic output
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-04-15T10:00:00Z"));
});

afterAll(() => {
  vi.useRealTimers();
});

describe("PaceTracker Integration (no mocks)", () => {
  it("renders without crashing and shows labels", () => {
    render(<PaceTracker completedLessons={10} totalLessons={50} />);
    expect(screen.getByText("📊 Pace Tracker")).toBeInTheDocument();
    // The component shows disabled state for unauthenticated users
    expect(screen.getByText("🔐 Please log in to track your pace")).toBeInTheDocument();
  });
});
