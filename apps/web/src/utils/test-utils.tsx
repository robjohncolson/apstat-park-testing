/* eslint-disable react-refresh/only-export-components */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { BlockchainProvider } from '../context/BlockchainProvider';
import { AuthProvider } from '../context/AuthContext';
// @ts-ignore – BookmarkProvider re-exports from BookmarkContext
import { BookmarkProvider } from '../context/BookmarkProvider';
import { BlockchainService } from '../services/BlockchainService';

// Define a default mock service that can be overridden
const createDefaultMockService = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
  submitLessonProgress: vi.fn().mockResolvedValue(undefined),
  submitPuzzleSolution: vi.fn().mockResolvedValue(undefined),
  submitPaceUpdate: vi.fn().mockResolvedValue(undefined),
  submitTransaction: vi.fn().mockResolvedValue(undefined),
  submitBookmark: vi.fn().mockResolvedValue(undefined),
  getPublicKey: () => 'test-public-key',
  state: {
    users: {},
    bookmarks: {},
    pace: {},
    starCounts: {},
    lessonProgress: new Set(),
    leaderboard: [],
  },
  // Basic stubs for BlockchainProvider expectations
  getState: () => ({
    syncStatus: "synced" as const,
    peerCount: 0,
    leaderboardData: [],
    isProposalRequired: false,
    puzzleData: null,
  }),
  subscribe: (cb: any) => {
    // Immediately invoke callback with default UI state
    cb({
      syncStatus: "synced",
      peerCount: 0,
      leaderboardData: [],
      isProposalRequired: false,
      puzzleData: null,
    });
    // Return unsubscribe no-op
    return () => {};
  },
  // Add other methods and properties as needed
});

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BlockchainProvider>
      <AuthProvider>
        <BookmarkProvider>{children}</BookmarkProvider>
      </AuthProvider>
    </BlockchainProvider>
  );
};

// This is our new, enhanced custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    mockService?: Partial<ReturnType<typeof createDefaultMockService>>;
  }
) => {
  // Create a fresh mock for each render call
  const mockServiceInstance = {
    ...createDefaultMockService(),
    ...options?.mockService, // Override with test-specific mocks
  };

  // Mock the getInstance method for this specific render
  vi.spyOn(BlockchainService, 'getInstance').mockReturnValue(
    mockServiceInstance as any
  );

  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from '@testing-library/react';
export { customRender as render };

// ---------------------------------------------------------------------------
// Backwards-compatibility helpers (to gradually migrate old tests)
// ---------------------------------------------------------------------------

// Alias to support legacy test files still importing `renderWithProviders`
export const renderWithProviders = customRender;

// Simple helper that clears all Vitest mocks – legacy tests relied on this
export const setupMocks = () => {
  // Clear call counts and reset spies but preserve module mocking configuration
  vi.clearAllMocks();
};

// Utility functions for common test scenarios
export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: "testuser",
  created_at: "2024-01-01T00:00:00.000Z",
  last_sync: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

export const createMockBookmark = (overrides = {}) => ({
  lesson_id: "lesson-1",
  lesson_title: "Test Lesson",
  unit_id: "unit-1",
  bookmark_type: "lesson" as const,
  created_at: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

// Helper to mock successful API responses
export const mockApiSuccess = (data: unknown) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);
};

// Helper to mock API failures
export const mockApiFailure = (status = 500) => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "API Error" }),
  } as Response);
};

const mockFetch = vi.fn();
