import React, { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { BlockchainService } from "../services/BlockchainService";

// Stub BlockchainService for all tests in this file
const mockChainService = {
  initialize: vi.fn().mockResolvedValue(undefined),
  submitTransaction: vi.fn().mockResolvedValue(undefined),
  getPublicKey: () => "test-public-key",
  state: {
    users: {},
    bookmarks: {},
    pace: {},
    starCounts: {},
    lessonProgress: {},
    leaderboard: [],
  },
  getState: () => ({
    syncStatus: "synced" as const,
    peerCount: 0,
    leaderboardData: [],
    isProposalRequired: false,
    puzzleData: null,
  }),
  subscribe: () => () => {},
} as any;

vi.spyOn(BlockchainService, "getInstance").mockReturnValue(mockChainService);

// Helper to wrap components with the AuthProvider
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  it("initializes with user: null and unauthenticated state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    // The provider resets isLoading to false immediately after mount
    expect(result.current.isLoading).toBe(false);
  });

  it("handles login flow correctly", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("test-user-42");
    });

    const stored = window.localStorage.getItem("apstat-user");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);

    expect(parsed.username).toBe("test-user-42");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(parsed);
  });

  it("handles logout flow correctly", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // First, log the user in
    await act(async () => {
      await result.current.login("logout-user");
    });

    // Then, perform logout
    act(() => {
      result.current.logout();
    });

    expect(window.localStorage.getItem("apstat-user")).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("loads existing user from localStorage on mount", async () => {
    const mockUser = {
      id: 123,
      username: "existing-user",
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
    };

    window.localStorage.setItem("apstat-user", JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for the useEffect inside AuthProvider to finish
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });
}); 