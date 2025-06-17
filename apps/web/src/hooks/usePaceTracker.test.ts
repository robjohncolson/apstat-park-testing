import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePaceTracker } from "./usePaceTracker";
import { useAuth } from "../context/AuthContext";

// Mock AuthContext
vi.mock("../context/AuthContext");

// Setup MSW for this test file
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockedUseAuth = vi.mocked(useAuth);

describe("usePaceTracker Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default to authenticated user
    mockedUseAuth.mockReturnValue({
      user: { 
        id: 123, 
        username: "test-user-123",
        created_at: "2024-01-01T00:00:00Z",
        last_sync: "2024-01-01T00:00:00Z"
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      generateUsername: vi.fn(),
    });
    
    // Setup default successful API response
    server.use(
      http.get('http://localhost:3001/api/v1/pace/:userId', ({ params, request }) => {
        const url = new URL(request.url);
        const completedLessons = parseInt(url.searchParams.get('completedLessons') || '35', 10);
        const totalLessons = parseInt(url.searchParams.get('totalLessons') || '89', 10);
        
        return HttpResponse.json({
          userId: parseInt(params.userId as string, 10),
          currentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          bufferHours: 5.5,
          lastCompletedLessons: completedLessons,
          lastLessonCompletion: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          examDate: new Date(2024, 4, 13, 8, 0, 0).toISOString(),
          updatedAt: new Date().toISOString(),
          wasLessonCompleted: false,
          metrics: {
            daysUntilExam: 50,
            hoursUntilExam: 1200,
            lessonsRemaining: totalLessons - completedLessons,
            totalLessons,
            completedLessons,
            lessonsPerDay: 1.2,
            hoursPerLesson: 1.5,
            isOnTrack: true,
            paceStatus: "on-track" as const,
            targetLessonsPerDay: 0.8,
            targetHoursPerDay: 1.2,
            nextDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            bufferHours: 5.5,
            aheadLessons: 1.2
          }
        });
      })
    );
  });

  describe("Initialization", () => {
    it("should start with loading state when user is authenticated", () => {
      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isDisabled).toBe(false);
      expect(result.current.paceData).toBeUndefined();
    });

    it("should be disabled when user is not authenticated", () => {
      // Mock no user
      mockedUseAuth.mockReturnValue({ 
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        generateUsername: vi.fn(),
      });

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      expect(result.current.isDisabled).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch pace data successfully", async () => {
      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paceData).toBeDefined();
      expect(result.current.paceData?.userId).toBe(123);
      expect(result.current.paceData?.lastCompletedLessons).toBe(35);
      expect(result.current.metrics).toBeDefined();
      expect(result.current.metrics?.completedLessons).toBe(35);
      expect(result.current.metrics?.totalLessons).toBe(89);
    });
  });

  describe("API Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      server.use(
        http.get('http://localhost:3001/api/v1/pace/:userId', () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        })
      );

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });

    it("should handle network failures gracefully", async () => {
      server.use(
        http.get('http://localhost:3001/api/v1/pace/:userId', () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain('Backend API');
    });
  });

  describe("Update Functionality", () => {
    it("should update pace data successfully", async () => {
      server.use(
        http.put('http://localhost:3001/api/v1/pace/:userId', async ({ request }) => {
          const body = await request.json() as any;
          return HttpResponse.json({
            userId: 123,
            currentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            bufferHours: 6.0,
            lastCompletedLessons: body.completedLessons,
            lastLessonCompletion: new Date().toISOString(),
            examDate: new Date(2024, 4, 13, 8, 0, 0).toISOString(),
            updatedAt: new Date().toISOString(),
            wasLessonCompleted: true,
            metrics: {
              daysUntilExam: 50,
              hoursUntilExam: 1200,
              lessonsRemaining: body.totalLessons - body.completedLessons,
              totalLessons: body.totalLessons,
              completedLessons: body.completedLessons,
              lessonsPerDay: 1.2,
              hoursPerLesson: 1.5,
              isOnTrack: true,
              paceStatus: "ahead" as const,
              targetLessonsPerDay: 0.8,
              targetHoursPerDay: 1.2,
              nextDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              bufferHours: 6.0,
              aheadLessons: 1.5
            }
          });
        })
      );

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test update
      await act(async () => {
        await result.current.updatePace({ 
          completedLessons: 36, 
          totalLessons: 89 
        });
      });

      expect(result.current.paceData?.lastCompletedLessons).toBe(36);
      expect(result.current.paceData?.wasLessonCompleted).toBe(true);
      expect(result.current.metrics?.paceStatus).toBe("ahead");
    });

    it("should handle update errors", async () => {
      server.use(
        http.put('http://localhost:3001/api/v1/pace/:userId', () => {
          return HttpResponse.json({ error: "Update failed" }, { status: 400 });
        })
      );

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test failed update
      await expect(async () => {
        await act(async () => {
          await result.current.updatePace({ 
            completedLessons: 36, 
            totalLessons: 89 
          });
        });
      }).rejects.toThrow();

      expect(result.current.updateError).toBeDefined();
    });
  });

  describe("Computed Values", () => {
    it("should calculate deadline-related values correctly", async () => {
      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentDeadline).toBeInstanceOf(Date);
      expect(result.current.bufferHours).toBe(5.5);
      expect(result.current.hoursUntilDeadline).toBeGreaterThan(0);
      expect(result.current.isOverdue).toBe(false);
    });

    it("should detect overdue deadlines", async () => {
      // Mock a deadline in the past
      server.use(
        http.get('http://localhost:3001/api/v1/pace/:userId', () => {
          return HttpResponse.json({
            userId: 123,
            currentDeadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
            bufferHours: 0,
            lastCompletedLessons: 35,
            lastLessonCompletion: null,
            examDate: new Date(2024, 4, 13, 8, 0, 0).toISOString(),
            updatedAt: new Date().toISOString(),
            wasLessonCompleted: false,
            metrics: {
              daysUntilExam: 50,
              hoursUntilExam: 1200,
              lessonsRemaining: 54,
              totalLessons: 89,
              completedLessons: 35,
              lessonsPerDay: 1.2,
              hoursPerLesson: 1.5,
              isOnTrack: false,
              paceStatus: "behind" as const,
              targetLessonsPerDay: 1.0,
              targetHoursPerDay: 1.5,
              nextDeadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              bufferHours: 0,
              aheadLessons: -0.5
            }
          });
        })
      );

      const { result } = renderHook(() => 
        usePaceTracker({ completedLessons: 35, totalLessons: 89 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOverdue).toBe(true);
      expect(result.current.hoursUntilDeadline).toBe(0);
    });
  });
}); 