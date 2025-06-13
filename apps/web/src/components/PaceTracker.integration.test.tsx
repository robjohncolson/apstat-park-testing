import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("📊 Study Pace")).toBeInTheDocument();
    expect(screen.getByText("Lessons Remaining")).toBeInTheDocument();
    expect(screen.getByText("Target Pace")).toBeInTheDocument();
  });
});
