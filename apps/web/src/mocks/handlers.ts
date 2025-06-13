// Here we define all our mock API request handlers
import { http, HttpResponse } from "msw";

const API_BASE_URL_3000 = "http://localhost:3000/api";
const API_BASE_URL_3001 = "http://localhost:3001/api";

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
];
