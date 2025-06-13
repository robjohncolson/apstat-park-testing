import { describe, it, expect } from "vitest";
import {
  fetchLeaderboardData,
  findUserRank,
  isValidLeaderboardEntry,
  validateLeaderboardData,
  type LeaderboardEntry,
} from "./leaderboard";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("Leaderboard Utilities - MSW Integration", () => {
  describe("fetchLeaderboardData", () => {
    it("should fetch leaderboard data successfully via MSW", async () => {
      const result = await fetchLeaderboardData();

      expect(result.isOffline).toBe(false);
      expect(result.error).toBe(null);
      expect(result.leaderboard).toHaveLength(3);

      // Verify MSW mock data structure
      expect(result.leaderboard[0]).toEqual({
        rank: 1,
        username: "MSW-Champion",
        completed_videos: 15,
        completed_quizzes: 12,
        total_completed: 27,
      });

      expect(result.leaderboard[1]).toEqual({
        rank: 2,
        username: "TestMaster",
        completed_videos: 10,
        completed_quizzes: 8,
        total_completed: 18,
      });

      expect(result.leaderboard[2]).toEqual({
        rank: 3,
        username: "mocked-user-123",
        completed_videos: 5,
        completed_quizzes: 4,
        total_completed: 9,
      });
    });

    it("should include current user in MSW response when specified", async () => {
      const result = await fetchLeaderboardData("mocked-user-123");

      expect(result.isOffline).toBe(false);
      expect(result.leaderboard).toHaveLength(3);

      // Current user should be in the MSW response
      const currentUser = result.leaderboard.find(
        (entry) => entry.username === "mocked-user-123",
      );
      expect(currentUser).toBeDefined();
      expect(currentUser?.rank).toBe(3);
    });

    it("should handle API failure and return offline fallback", async () => {
      // Override MSW to return an error
      server.use(
        http.get("/api/leaderboard", () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      const result = await fetchLeaderboardData();

      expect(result.isOffline).toBe(true);
      expect(result.error).toBe("API unavailable - showing sample data");
      expect(result.leaderboard).toHaveLength(3);

      // Verify offline fallback data
      expect(result.leaderboard[0]).toEqual({
        rank: 1,
        username: "StudyBot",
        completed_videos: 7,
        completed_quizzes: 5,
        total_completed: 12,
      });
    });

    it("should add current user to offline fallback when not in list", async () => {
      // Override MSW to return an error
      server.use(
        http.get("/api/leaderboard", () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      const result = await fetchLeaderboardData("NewUser123");

      expect(result.isOffline).toBe(true);
      expect(result.leaderboard).toHaveLength(4); // 3 default + 1 new user

      // New user should be added to the end
      const newUser = result.leaderboard.find(
        (entry) => entry.username === "NewUser123",
      );
      expect(newUser).toEqual({
        rank: 4,
        username: "NewUser123",
        completed_videos: 2,
        completed_quizzes: 1,
        total_completed: 3,
      });
    });

    it("should not duplicate user in offline fallback if already exists", async () => {
      // Override MSW to return an error
      server.use(
        http.get("/api/leaderboard", () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      const result = await fetchLeaderboardData("StudyBot"); // Already in offline list

      expect(result.isOffline).toBe(true);
      expect(result.leaderboard).toHaveLength(3); // Should not add duplicate

      // StudyBot should still be rank 1
      const existingUser = result.leaderboard.find(
        (entry) => entry.username === "StudyBot",
      );
      expect(existingUser?.rank).toBe(1);
    });

    it("should handle malformed API response gracefully", async () => {
      // Override MSW to return malformed data
      server.use(
        http.get("/api/leaderboard", () => {
          return HttpResponse.json({
            success: false,
            error: "Database connection failed",
          });
        }),
      );

      const result = await fetchLeaderboardData();

      expect(result.isOffline).toBe(true);
      expect(result.error).toBe("API unavailable - showing sample data");
      expect(result.leaderboard).toHaveLength(3);
    });
  });

  describe("findUserRank", () => {
    const mockLeaderboard: LeaderboardEntry[] = [
      {
        rank: 1,
        username: "TopPlayer",
        completed_videos: 10,
        completed_quizzes: 8,
        total_completed: 18,
      },
      {
        rank: 2,
        username: "SecondPlace",
        completed_videos: 8,
        completed_quizzes: 6,
        total_completed: 14,
      },
      {
        rank: 3,
        username: "ThirdPlace",
        completed_videos: 5,
        completed_quizzes: 4,
        total_completed: 9,
      },
    ];

    it("should find user rank when user exists", () => {
      const userRank = findUserRank(mockLeaderboard, "SecondPlace");

      expect(userRank).toEqual({
        rank: 2,
        username: "SecondPlace",
        completed_videos: 8,
        completed_quizzes: 6,
        total_completed: 14,
      });
    });

    it("should return undefined when user does not exist", () => {
      const userRank = findUserRank(mockLeaderboard, "NonExistentUser");
      expect(userRank).toBeUndefined();
    });

    it("should return undefined when username is not provided", () => {
      const userRank = findUserRank(mockLeaderboard, undefined);
      expect(userRank).toBeUndefined();
    });

    it("should handle empty leaderboard", () => {
      const userRank = findUserRank([], "AnyUser");
      expect(userRank).toBeUndefined();
    });
  });

  describe("isValidLeaderboardEntry", () => {
    it("should validate correct leaderboard entry", () => {
      const validEntry = {
        rank: 1,
        username: "TestUser",
        completed_videos: 5,
        completed_quizzes: 3,
        total_completed: 8,
      };

      expect(isValidLeaderboardEntry(validEntry)).toBe(true);
    });

    it("should reject entry with missing fields", () => {
      const invalidEntry = {
        rank: 1,
        username: "TestUser",
        completed_videos: 5,
        // Missing completed_quizzes and total_completed
      };

      expect(isValidLeaderboardEntry(invalidEntry)).toBe(false);
    });

    it("should reject entry with wrong field types", () => {
      const invalidEntry = {
        rank: "1", // Should be number
        username: "TestUser",
        completed_videos: 5,
        completed_quizzes: 3,
        total_completed: 8,
      };

      expect(isValidLeaderboardEntry(invalidEntry)).toBe(false);
    });

    it("should reject null or undefined", () => {
      expect(isValidLeaderboardEntry(null)).toBe(false);
      expect(isValidLeaderboardEntry(undefined)).toBe(false);
    });
  });

  describe("validateLeaderboardData", () => {
    it("should validate correct leaderboard response", () => {
      const validResponse = {
        success: true,
        leaderboard: [
          {
            rank: 1,
            username: "TestUser",
            completed_videos: 5,
            completed_quizzes: 3,
            total_completed: 8,
          },
        ],
      };

      expect(validateLeaderboardData(validResponse)).toBe(true);
    });

    it("should reject response with invalid leaderboard entries", () => {
      const invalidResponse = {
        success: true,
        leaderboard: [
          {
            rank: 1,
            username: "TestUser",
            // Missing required fields
          },
        ],
      };

      expect(validateLeaderboardData(invalidResponse)).toBe(false);
    });

    it("should reject response without success field", () => {
      const invalidResponse = {
        leaderboard: [],
      };

      expect(validateLeaderboardData(invalidResponse)).toBe(false);
    });

    it("should reject response where leaderboard is not an array", () => {
      const invalidResponse = {
        success: true,
        leaderboard: "not an array",
      };

      expect(validateLeaderboardData(invalidResponse)).toBe(false);
    });
  });

  describe("MSW Integration Verification", () => {
    it("should demonstrate MSW is intercepting requests correctly", async () => {
      // Make a direct fetch call to verify MSW interception
      const response = await fetch("/api/leaderboard");
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.leaderboard).toHaveLength(3);
      expect(data.leaderboard[0].username).toBe("MSW-Champion");

      // This proves MSW is working - we're getting mock data, not real API data
    });

    it("should handle different MSW response scenarios", async () => {
      // Test successful response (default handler)
      let result = await fetchLeaderboardData();
      expect(result.isOffline).toBe(false);

      // Override with error response
      server.use(
        http.get("/api/leaderboard", () => {
          return new HttpResponse(null, { status: 404 });
        }),
      );

      result = await fetchLeaderboardData();
      expect(result.isOffline).toBe(true);

      // Override with different success response
      server.use(
        http.get("/api/leaderboard", () => {
          return HttpResponse.json({
            success: true,
            leaderboard: [
              {
                rank: 1,
                username: "DynamicMockUser",
                completed_videos: 20,
                completed_quizzes: 15,
                total_completed: 35,
              },
            ],
          });
        }),
      );

      result = await fetchLeaderboardData();
      expect(result.isOffline).toBe(false);
      expect(result.leaderboard[0].username).toBe("DynamicMockUser");
      expect(result.leaderboard[0].total_completed).toBe(35);
    });
  });
});
