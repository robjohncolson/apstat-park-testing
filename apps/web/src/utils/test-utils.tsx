import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi, beforeEach } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { BookmarkProvider } from "../context/BookmarkContext";

// Mock localStorage for tests
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock fetch for tests
const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  }),
);

// Setup function to be called manually in tests that need it
export const setupMocks = () => {
  // Reset localStorage mock
  mockLocalStorage.clear();
  Object.defineProperty(window, "localStorage", {
    value: mockLocalStorage,
    writable: true,
  });

  // Reset fetch mock
  mockFetch.mockClear();
  global.fetch = mockFetch as any;
};

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Allow tests to provide initial route
  initialRoute?: string;
  // Allow tests to skip certain providers if needed
  skipAuth?: boolean;
  skipBookmarks?: boolean;
  skipRouter?: boolean;
}

function AllTheProviders({
  children,
  skipAuth = false,
  skipBookmarks = false,
  skipRouter = false,
}: {
  children: React.ReactNode;
  skipAuth?: boolean;
  skipBookmarks?: boolean;
  skipRouter?: boolean;
}) {
  let component = <>{children}</>;

  // Wrap with BookmarkProvider (depends on AuthProvider)
  if (!skipBookmarks && !skipAuth) {
    component = <BookmarkProvider>{component}</BookmarkProvider>;
  }

  // Wrap with AuthProvider
  if (!skipAuth) {
    component = <AuthProvider>{component}</AuthProvider>;
  }

  // Wrap with Router
  if (!skipRouter) {
    component = <BrowserRouter>{component}</BrowserRouter>;
  }

  return component;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialRoute = "/",
    skipAuth = false,
    skipBookmarks = false,
    skipRouter = false,
    ...renderOptions
  }: CustomRenderOptions = {},
) {
  // Set initial route if router is not skipped
  if (!skipRouter && initialRoute !== "/") {
    window.history.pushState({}, "Test page", initialRoute);
  }

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders
        skipAuth={skipAuth}
        skipBookmarks={skipBookmarks}
        skipRouter={skipRouter}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything from testing-library
export * from "@testing-library/react";

// Export our custom render as the default render
export { renderWithProviders as render };

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
export const mockApiSuccess = (data: any) => {
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
