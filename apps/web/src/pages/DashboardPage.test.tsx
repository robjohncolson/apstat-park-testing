import { ReactNode } from "react";
import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { DashboardPage } from "./DashboardPage.tsx";
import { renderWithProviders } from "../utils/test-utils";

// Helper user in localStorage to authenticate AuthContext
const mockUser = {
  id: 1,
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
  beforeEach(() => {
    primeUser();
  });

  it("renders welcome message and stats after successful data fetch", async () => {
    const mockProgress = [
      { lesson_id: "1-1", videos_watched: [1], quizzes_completed: [1] },
    ];
    mockFetchOnce(mockProgress);

    renderWithProviders(<DashboardPage />);

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

    renderWithProviders(<DashboardPage />);

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

    renderWithProviders(<DashboardPage />);

    // Expect page still renders welcome header
    expect(
      screen.getByRole("heading", { name: /welcome, dash-tester!/i })
    ).toBeInTheDocument();

    // Should eventually render stats section even after failure
    await screen.findByText(/Your Learning Journey/i);
  });
}); 