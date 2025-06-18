// Here we define all our mock API request handlers
import { http, HttpResponse } from "msw";

const API_BASE_URL_3000 = "http://localhost:3000/api";
const API_BASE_URL_3001 = "http://localhost:3001/api";
const RAILWAY_API_URL = "https://apstat-park-api.up.railway.app/api";

export const handlers = [
  // Mock for generating a username - try both ports and relative URLs
  http.get(`${API_BASE_URL_3000}/generate-username`, () => {
    console.log("MSW: Intercepted generate-username request (3000)");
    return HttpResponse.json({ username: "mocked-user-123" });
  }),

  http.get(`${API_BASE_URL_3001}/generate-username`, () => {
    console.log("MSW: Intercepted generate-username request (3001)");
    return HttpResponse.json({ username: "mocked-user-123" });
  }),

  http.get("/api/generate-username", () => {
    console.log("MSW: Intercepted generate-username request (relative URL)");
    return HttpResponse.json({ username: "mocked-user-123" });
  }),

  http.get(`${RAILWAY_API_URL}/generate-username`, () => {
    console.log("MSW: Intercepted generate-username request (Railway)");
    return HttpResponse.json({ username: "mocked-railway-user-123" });
  }),

  // Mock for getting or creating a user - try both ports and relative URLs
  http.post(`${API_BASE_URL_3000}/users/get-or-create`, async ({ request }) => {
    console.log("MSW: Intercepted users/get-or-create request (3000)");
    const body = (await request.json()) as { username?: string };
    const username = body.username || "default-mock-user";

    // Return a standard user object
    const mockUser = {
      id: Math.floor(Math.random() * 1000),
      username: username,
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, user: mockUser });
  }),

  http.post(`${API_BASE_URL_3001}/users/get-or-create`, async ({ request }) => {
    console.log("MSW: Intercepted users/get-or-create request (3001)");
    const body = (await request.json()) as { username?: string };
    const username = body.username || "default-mock-user";

    // Return a standard user object
    const mockUser = {
      id: Math.floor(Math.random() * 1000),
      username: username,
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, user: mockUser });
  }),

  http.post("/api/users/get-or-create", async ({ request }) => {
    console.log("MSW: Intercepted users/get-or-create request (relative URL)");
    const body = (await request.json()) as { username?: string };
    const username = body.username || "default-mock-user";

    // Return a standard user object
    const mockUser = {
      id: Math.floor(Math.random() * 1000),
      username: username,
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, user: mockUser });
  }),

  // Mock for leaderboard data
  http.get("/api/leaderboard", () => {
    return HttpResponse.json({
      success: true,
      leaderboard: [
        {
          rank: 1,
          username: "MSW-Champion",
          completed_videos: 15,
          completed_quizzes: 12,
          total_completed: 27,
        },
        {
          rank: 2,
          username: "TestMaster",
          completed_videos: 10,
          completed_quizzes: 8,
          total_completed: 18,
        },
        {
          rank: 3,
          username: "mocked-user-123",
          completed_videos: 5,
          completed_quizzes: 4,
          total_completed: 9,
        },
      ],
    });
  }),

  // --- Bookmark endpoints ---
  http.get(`${API_BASE_URL_3000}/users/:userId/bookmarks`, () => {
    console.log("MSW: Intercepted GET bookmarks (3000)");
    return HttpResponse.json({ bookmarks: [] });
  }),

  http.post(`${API_BASE_URL_3000}/users/:userId/bookmarks`, async ({ request }) => {
    console.log("MSW: Intercepted POST bookmarks (3000)");
    const newBookmark = await request.json();
    return HttpResponse.json(newBookmark, { status: 201 });
  }),

  http.post(`${API_BASE_URL_3000}/users/:userId/bookmarks/sync`, async ({ request }) => {
    console.log("MSW: Intercepted POST bookmarks/sync (3000)");
    await request.json();
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  http.delete(`${API_BASE_URL_3000}/users/:userId/bookmarks/:bookmarkId`, () => {
    console.log("MSW: Intercepted DELETE bookmark (3000)");
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // --- Progress endpoint ---
  http.get(`${API_BASE_URL_3000}/users/:userId/progress`, () => {
    console.log("MSW: Intercepted GET progress (3000)");
    const mockProgress = [
      { lesson_id: "1-1", videos_watched: [1], quizzes_completed: [1] },
      { lesson_id: "1-2", videos_watched: [1], quizzes_completed: [] },
    ];
    return HttpResponse.json(mockProgress);
  }),

  // --- Pace Tracker API endpoints ---
  http.get(`${API_BASE_URL_3001}/v1/pace/:userId`, ({ params, request }) => {
    console.log("MSW: Intercepted GET pace data (3001)");
    const url = new URL(request.url);
    const completedLessons = parseInt(url.searchParams.get('completedLessons') || '35', 10);
    const totalLessons = parseInt(url.searchParams.get('totalLessons') || '89', 10);
    
    // Calculate mock exam date (next May 13th)
    const currentYear = new Date().getFullYear();
    const mayExamDate = new Date(currentYear, 4, 13, 8, 0, 0);
    const examDate = new Date() > mayExamDate 
      ? new Date(currentYear + 1, 4, 13, 8, 0, 0)
      : mayExamDate;
    
    // Mock deadline (24 hours from now)
    const currentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Mock metrics calculation
    const lessonsRemaining = Math.max(0, totalLessons - completedLessons);
    const daysUntilExam = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const hoursUntilExam = (examDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const targetLessonsPerDay = lessonsRemaining / Math.max(1, daysUntilExam);
    const hoursPerLesson = hoursUntilExam / Math.max(1, lessonsRemaining);
    
    return HttpResponse.json({
      userId: parseInt(params.userId as string, 10),
      currentDeadline: currentDeadline.toISOString(),
      bufferHours: 5.5,
      lastCompletedLessons: completedLessons,
      lastLessonCompletion: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      examDate: examDate.toISOString(),
      updatedAt: new Date().toISOString(),
      wasLessonCompleted: false,
      metrics: {
        daysUntilExam,
        hoursUntilExam,
        lessonsRemaining,
        totalLessons,
        completedLessons,
        lessonsPerDay: completedLessons > 0 ? completedLessons / 30 : 0, // Assume 30 days elapsed
        hoursPerLesson,
        isOnTrack: true,
        paceStatus: "on-track" as const,
        targetLessonsPerDay,
        targetHoursPerDay: targetLessonsPerDay * hoursPerLesson,
        nextDeadline: currentDeadline.toISOString(),
        bufferHours: 5.5,
        aheadLessons: 1.2
      }
    });
  }),

  http.put(`${API_BASE_URL_3001}/v1/pace/:userId`, async ({ params, request }) => {
    console.log("MSW: Intercepted PUT pace data (3001)");
    const body = await request.json() as { completedLessons: number; totalLessons: number; examDate?: string };
    
    // Calculate updated values based on the request body
    const { completedLessons, totalLessons } = body;
    const examDate = body.examDate ? new Date(body.examDate) : new Date(new Date().getFullYear(), 4, 13, 8, 0, 0);
    const currentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const lessonsRemaining = Math.max(0, totalLessons - completedLessons);
    const daysUntilExam = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const hoursUntilExam = (examDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const targetLessonsPerDay = lessonsRemaining / Math.max(1, daysUntilExam);
    const hoursPerLesson = hoursUntilExam / Math.max(1, lessonsRemaining);
    
    return HttpResponse.json({
      userId: parseInt(params.userId as string, 10),
      currentDeadline: currentDeadline.toISOString(),
      bufferHours: 6.0, // Slightly increased after update
      lastCompletedLessons: completedLessons,
      lastLessonCompletion: new Date().toISOString(), // Just updated
      examDate: examDate.toISOString(),
      updatedAt: new Date().toISOString(),
      wasLessonCompleted: true,
      metrics: {
        daysUntilExam,
        hoursUntilExam,
        lessonsRemaining,
        totalLessons,
        completedLessons,
        lessonsPerDay: completedLessons > 0 ? completedLessons / 30 : 0,
        hoursPerLesson,
        isOnTrack: true,
        paceStatus: "ahead" as const, // Show as ahead after update
        targetLessonsPerDay,
        targetHoursPerDay: targetLessonsPerDay * hoursPerLesson,
        nextDeadline: currentDeadline.toISOString(),
        bufferHours: 6.0,
        aheadLessons: 1.5
      }
    });
  }),
];
