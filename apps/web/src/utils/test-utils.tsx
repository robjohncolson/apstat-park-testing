/* eslint-disable react-refresh/only-export-components */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as BlockchainContext from '../context/BlockchainProvider';
import { AuthProvider } from '../context/AuthContext';
// @ts-ignore – BookmarkProvider re-exports context
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
    lessonProgress: {},
    leaderboard: [],
  },
  // UI-state accessors expected by BlockchainProvider consumers (not used in
  // most tests but mocked for completeness).
  getState: () => ({
    syncStatus: 'synced' as const,
    peerCount: 0,
    leaderboardData: [],
    isProposalRequired: false,
    puzzleData: null,
  }),
  subscribe: (cb: any) => {
    cb({
      syncStatus: 'synced',
      peerCount: 0,
      leaderboardData: [],
      isProposalRequired: false,
      puzzleData: null,
    });
    return () => {};
  },
  // Add other methods and properties as needed
});

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>
      <BookmarkProvider>{children}</BookmarkProvider>
    </AuthProvider>
  </MemoryRouter>
);

// This is our new, enhanced custom render function
type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  /** Partial overrides for the mocked useBlockchain return value */
  blockchainContextValue?: Partial<ReturnType<typeof BlockchainContext.useBlockchain>>;
  /**
   * Legacy support: allow tests to stub BlockchainService.getInstance().
   * Prefer using `blockchainContextValue` moving forward.
   */
  mockService?: Partial<ReturnType<typeof createDefaultMockService>>;
};

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {},
) => {
  // ---------------------------------------------------------------------
  // 1. Mock useBlockchain so components receive predictable values
  // ---------------------------------------------------------------------
  const defaultBlockchainContext = {
    syncStatus: 'synced' as const,
    peerCount: 0,
    leaderboardData: [],
    isProposalRequired: false,
    puzzleData: null,
    appState: {
      users: {},
      bookmarks: {},
      pace: {},
      starCounts: {},
      lessonProgress: {},
      leaderboard: [],
    },
    initialize: vi.fn(),
    start: vi.fn(),
    submitLessonProgress: vi.fn(),
    submitPuzzleSolution: vi.fn(),
    // Expose underlying service for tests that still rely on it.
    blockchainService: {
      submitTransaction: vi.fn(),
    },
  } as any;

  const mockedContext = {
    ...defaultBlockchainContext,
    ...options.blockchainContextValue,
  } as any;

  if (vi.isMockFunction(BlockchainContext.useBlockchain)) {
    (BlockchainContext.useBlockchain as any).mockReturnValue(mockedContext);
  } else {
    vi.spyOn(BlockchainContext, 'useBlockchain').mockReturnValue(mockedContext);
  }

  // ---------------------------------------------------------------------
  // 2. Legacy – still allow stubbing BlockchainService.getInstance()
  // ---------------------------------------------------------------------
  if (options.mockService) {
    const serviceInstance = {
      ...createDefaultMockService(),
      ...options.mockService,
    } as any;

    vi.spyOn(BlockchainService, 'getInstance').mockReturnValue(serviceInstance);
  }

  // ---------------------------------------------------------------------
  // 3. Render with common providers
  // ---------------------------------------------------------------------
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
