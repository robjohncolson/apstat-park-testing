import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Routes, Route } from "react-router-dom";

import { LessonPage } from "./LessonPage";
import { renderWithProviders } from "../utils/test-utils";

// Reusable helper to inject a logged-in user for AuthContext
const mockUser = {
  id: 42,
  username: "lesson-tester",
  created_at: new Date().toISOString(),
  last_sync: new Date().toISOString(),
};

const primeUser = () => {
  window.localStorage.setItem("apstat-user", JSON.stringify(mockUser));
};

// Utility to render LessonPage within a matching route so useParams works
const renderLesson = (initialRoute = "/unit/unit1/lesson/1-1") => {
  return renderWithProviders(
    <Routes>
      <Route path="/unit/:unitId/lesson/:lessonId" element={<LessonPage />} />
    </Routes>,
    { initialRoute },
  );
};

// Clean up between each test
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("LessonPage", () => {
  beforeEach(() => {
    primeUser();
  });

  it("renders lesson title, description and activities for a valid lesson ID", async () => {
    // 1st fetch – progress lookup
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    renderLesson();

    // Wait for loading to finish by finding the lesson heading
    await screen.findByRole("heading", { name: /topic 1\.1/i });

    // Verify description & activities appear
    expect(screen.getByText(/introducing statistics/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /videos/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /video 1/i })).toBeInTheDocument();
  });

  it("displays 'Lesson Not Found' for an invalid lesson ID", async () => {
    // progress fetch still fires even for invalid lesson route – stub it
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    renderLesson("/unit/unit1/lesson/99-99");

    await screen.findByRole("heading", { name: /lesson not found/i });
    expect(
      screen.getByText(/could not find lesson 99-99 in unit unit1/i),
    ).toBeInTheDocument();
  });

  it("allows a user to bookmark an unbookmarked video", async () => {
    // Sequence: 1) progress GET, 2) bookmarks GET, 3) bookmark sync POST
    const fetchMock = vi
      .fn()
      // progress
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response)
      // bookmarks (none)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bookmarks: [] }),
      } as Response)
      // bookmark sync
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

    // Overwrite global fetch with our stub sequence
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – jest/vitest global augmentation
    global.fetch = fetchMock;

    renderLesson();

    // Wait until the bookmark button with pin icon appears
    const bookmarkBtn = await screen.findByRole("button", {
      name: /📍/i,
    });

    expect(bookmarkBtn).toHaveTextContent("📍");
    expect(bookmarkBtn).not.toBeDisabled();

    fireEvent.click(bookmarkBtn);

    // Button should now reflect bookmarked state
    await waitFor(() => {
      expect(bookmarkBtn).toBeDisabled();
      expect(bookmarkBtn).toHaveTextContent("📌");
    });
  });

  it("calls progress update API with correct payload when marking a video as watched", async () => {
    const fetchMock = vi
      .fn()
      // progress GET
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response)
      // progress POST (update) – respond with success
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – jest/vitest global augmentation
    global.fetch = fetchMock;

    renderLesson();

    // Find the "Mark as Watched" button for first video
    const watchBtn = await screen.findByRole("button", {
      name: /mark as watched/i,
    });

    fireEvent.click(watchBtn);

    // Wait until the update call is made (it may be 2nd or 3rd depending on bookmark fetch)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      // Ensure at least one call targets the update endpoint
      expect(
        fetchMock.mock.calls.some((args) => (args[0] as string).includes("progress/update")),
      ).toBe(true);
    });

    // Find the call that hit /progress/update
    const updateCall = fetchMock.mock.calls.find((args) => (args[0] as string).includes("progress/update"));
    expect(updateCall).toBeTruthy();

    const [updateUrl, updateOptions] = updateCall!;

    // Ensure correct endpoint hit
    expect(updateUrl).toMatch(/progress\/update/);

    const payload = JSON.parse((updateOptions as RequestInit).body as string);

    expect(payload).toEqual({
      lesson_id: "1-1",
      item_type: "video",
      item_index: 0,
      completed: true,
    });
  });
}); 