// Simple fetch interceptor for E2E testing
// This script will be loaded conditionally when ?msw=true is in the URL

(function () {
  // Check if mocking should be enabled
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("msw") === "true") {
    console.log("Mock: Initializing simple fetch interceptor...");

    // Store the original fetch
    const originalFetch = window.fetch;

    // Override fetch with our mock responses
    window.fetch = function (url, options) {
      console.log("Mock: Intercepting fetch request to:", url);

      // Mock generate-username endpoint
      if (url.includes("/api/generate-username")) {
        console.log("Mock: Returning mocked username");
        return Promise.resolve(
          new Response(JSON.stringify({ username: "mocked-user-123" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Mock users/get-or-create endpoint
      if (url.includes("/api/users/get-or-create")) {
        console.log("Mock: Returning mocked user");

        // Parse the request body to get the username
        if (options && options.body) {
          try {
            const requestBody = JSON.parse(options.body);
            const username = requestBody.username || "mocked-user-123";

            const mockUser = {
              id: 999,
              username: username,
              created_at: new Date().toISOString(),
              last_sync: new Date().toISOString(),
            };
            return Promise.resolve(
              new Response(JSON.stringify({ success: true, user: mockUser }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
            );
          } catch (e) {
            console.log(
              "Mock: Could not parse request body, using default username",
            );
          }
        }

        // Fallback to default username
        const mockUser = {
          id: 999,
          username: "mocked-user-123",
          created_at: new Date().toISOString(),
          last_sync: new Date().toISOString(),
        };
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Mock leaderboard endpoint
      if (url.includes("/api/leaderboard")) {
        console.log("Mock: Returning mocked leaderboard");
        const mockLeaderboard = {
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
        };
        return Promise.resolve(
          new Response(JSON.stringify(mockLeaderboard), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // For all other requests, use the original fetch
      return originalFetch.apply(this, arguments);
    };

    console.log("Mock: Simple fetch interceptor initialized successfully");
    window.mockReady = true;
  }
})();
