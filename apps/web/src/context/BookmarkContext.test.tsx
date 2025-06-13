import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AuthProvider } from "./AuthContext";
import { BookmarkProvider, useBookmark } from "./BookmarkContext";

// Helper: wrap providers
const Providers = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <BookmarkProvider>{children}</BookmarkProvider>
  </AuthProvider>
);

const mockUser = {
  id: 1,
  username: "bookmark-tester",
  created_at: new Date().toISOString(),
  last_sync: new Date().toISOString(),
};

// Utility to prime user in localStorage
const primeUser = () => {
  window.localStorage.setItem("apstat-user", JSON.stringify(mockUser));
};

// Ensure fetch is restored after tests
afterEach(() => {
  vi.restoreAllMocks();
});

describe("BookmarkContext", () => {
  beforeEach(() => {
    primeUser();
  });

  it("initial state has no bookmark and unauthenticated bookmark status", async () => {
    const { result } = renderHook(() => useBookmark(), { wrapper: Providers });

    // wait until any initial loading finishes
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeBookmark).toBeNull();
    expect(result.current.isItemBookmarked("lesson-1")).toBe(false);
  });

  it("loads bookmark from localStorage when API fails", async () => {
    const storedBookmark = {
      lesson_id: "1-2",
      lesson_title: "Stored Lesson",
      unit_id: "unit1",
      bookmark_type: "lesson" as const,
      created_at: new Date().toISOString(),
    };

    window.localStorage.setItem(
      `bookmark_${mockUser.id}`,
      JSON.stringify(storedBookmark),
    );

    // Force fetch to fail so provider falls back to localStorage
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network"));

    const { result } = renderHook(() => useBookmark(), { wrapper: Providers });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeBookmark).toEqual(storedBookmark);
    expect(result.current.isItemBookmarked("1-2")).toBe(true);
  });

  it("addBookmark flow updates state and localStorage", async () => {
    // Fail all fetches to trigger offline path
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network"));

    const { result } = renderHook(() => useBookmark(), { wrapper: Providers });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newBookmark = {
      lesson_id: "2-3",
      lesson_title: "New Lesson",
      unit_id: "unit2",
      bookmark_type: "lesson" as const,
    };

    await act(async () => {
      await result.current.setBookmark(newBookmark);
    });

    // activeBookmark should now be populated
    expect(result.current.activeBookmark?.lesson_id).toBe("2-3");
    expect(result.current.isItemBookmarked("2-3")).toBe(true);

    // localStorage should contain the bookmark since we were offline
    const stored = window.localStorage.getItem(`bookmark_${mockUser.id}`);
    expect(stored).not.toBeNull();
  });

  it("removeBookmark flow clears state and localStorage", async () => {
    // Fail fetches again
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network"));

    const { result } = renderHook(() => useBookmark(), { wrapper: Providers });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // First add a bookmark
    const bookmark = {
      lesson_id: "3-1",
      lesson_title: "Temp Lesson",
      unit_id: "unit3",
      bookmark_type: "lesson" as const,
    };

    await act(async () => {
      await result.current.setBookmark(bookmark);
    });

    // Now remove it
    await act(async () => {
      await result.current.clearBookmark();
    });

    expect(result.current.activeBookmark).toBeNull();
    expect(result.current.isItemBookmarked("3-1")).toBe(false);
    expect(window.localStorage.getItem(`bookmark_${mockUser.id}`)).toBeNull();
  });
}); 