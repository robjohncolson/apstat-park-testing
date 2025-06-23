import React, { ReactNode } from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "../utils/test-utils";
import { DashboardPage } from "./DashboardPage.tsx";

const publicKey = "test-public-key";

const mockUser = {
  id: publicKey, // Must match BlockchainService.getPublicKey()
  username: "dash-tester",
  created_at: new Date().toISOString(),
  last_sync: new Date().toISOString(),
};

const primeUser = () => {
  window.localStorage.setItem("apstat-user", JSON.stringify(mockUser));
};

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

// Helper to mock fetch with given response
const mockFetchOnce = (data: unknown, ok = true, status = 200) => {
  vi.spyOn(global, "fetch").mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
};

// Mock react-modal to simplify DOM interactions during tests
vi.mock("react-modal", () => {
  const Modal = ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div data-testid="mock-modal">{children}</div> : null;
  Modal.setAppElement = () => null;
  return { __esModule: true, default: Modal };
});

describe("DashboardPage", () => {
  const createMockService = () => ({
    // Minimal override – will be merged with the default mock in test-utils
    state: {
      users: {
        [publicKey]: {
          publicKey,
          username: mockUser.username,
          createdAt: Date.now(),
        },
      },
      bookmarks: {},
      pace: {},
      starCounts: {},
      lessonProgress: {
        [publicKey]: new Set<string>(),
      },
      leaderboard: [],
    },
    getPublicKey: () => publicKey,
  } as any);

  beforeEach(() => {
    primeUser();
  });

  it("renders welcome message and stats after successful data fetch", async () => {
    const mockProgress = [
      { lesson_id: "1-1", videos_watched: [1], quizzes_completed: [1] },
    ];
    mockFetchOnce(mockProgress);

    const mockService = createMockService();
    render(<DashboardPage />, { mockService });

    // Welcome header should appear immediately
    expect(
      screen.getByRole("heading", { name: /welcome, dash-tester!/i })
    ).toBeInTheDocument();

    // Wait for progress text to update after fetch
    await screen.findByText(/Your Learning Journey/i);

    // Expect that some completion percentage shows (non-zero or zero)
    await waitFor(() => {
      expect(screen.getByText(/%\s*Complete/i)).toBeInTheDocument();
    });
  });

  it("shows 0% progress when API returns empty array", async () => {
    mockFetchOnce([]);

    const mockService = createMockService();
    render(<DashboardPage />, { mockService });

    const progressEl = await screen.findByText(/0% Complete|0\.00% Complete/i);
    expect(progressEl).toBeInTheDocument();
  });

  it("falls back gracefully when API returns error", async () => {
    // Mock failed fetch (status 500)
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    const mockService = createMockService();
    render(<DashboardPage />, { mockService });

    // Expect page still renders welcome header
    expect(
      screen.getByRole("heading", { name: /welcome, dash-tester!/i })
    ).toBeInTheDocument();

    // Should eventually render stats section even after failure
    await screen.findByText(/Your Learning Journey/i);
  });
}); 