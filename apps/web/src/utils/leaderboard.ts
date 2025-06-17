export interface LeaderboardEntry {
  rank: number;
  username: string;
  completed_videos: number;
  completed_quizzes: number;
  total_completed: number;
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  error?: string;
}

/**
 * Fetches leaderboard data from the API
 * Returns both API data and offline fallback data
 */
export async function fetchLeaderboardData(currentUsername?: string): Promise<{
  leaderboard: LeaderboardEntry[];
  isOffline: boolean;
  error: string | null;
}> {
  try {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    const fullUrl = `${apiUrl}/api/leaderboard`;
    console.log('API Base URL:', apiUrl);
    console.log('Full API URL:', fullUrl);
    const response = await fetch(fullUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch leaderboard data.");
    }

    const data: LeaderboardResponse = await response.json();

    if (data.success) {
      return {
        leaderboard: data.leaderboard,
        isOffline: false,
        error: null,
      };
    } else {
      throw new Error(data.error || "An unknown error occurred.");
    }
  } catch {
    console.warn("API not available - showing offline leaderboard");

    // Offline fallback - show mock data
    const mockLeaderboard: LeaderboardEntry[] = [
      {
        rank: 1,
        username: "StudyBot",
        completed_videos: 7,
        completed_quizzes: 5,
        total_completed: 12,
      },
      {
        rank: 2,
        username: "MathWhiz",
        completed_videos: 6,
        completed_quizzes: 4,
        total_completed: 10,
      },
      {
        rank: 3,
        username: "StatGuru",
        completed_videos: 5,
        completed_quizzes: 3,
        total_completed: 8,
      },
    ];

    // If current user exists, add them to the mock leaderboard
    if (currentUsername) {
      const userInList = mockLeaderboard.find(
        (entry) => entry.username === currentUsername,
      );
      if (!userInList) {
        mockLeaderboard.push({
          rank: mockLeaderboard.length + 1,
          username: currentUsername,
          completed_videos: 2,
          completed_quizzes: 1,
          total_completed: 3,
        });
      }
    }

    return {
      leaderboard: mockLeaderboard,
      isOffline: true,
      error: "API unavailable - showing sample data",
    };
  }
}

/**
 * Finds the current user's rank in the leaderboard
 */
export function findUserRank(
  leaderboard: LeaderboardEntry[],
  username?: string,
): LeaderboardEntry | undefined {
  if (!username) return undefined;
  return leaderboard.find((entry) => entry.username === username);
}

/**
 * Validates leaderboard entry data structure
 */
export function isValidLeaderboardEntry(entry: unknown): entry is LeaderboardEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as Record<string, unknown>).rank === "number" &&
    typeof (entry as Record<string, unknown>).username === "string" &&
    typeof (entry as Record<string, unknown>).completed_videos === "number" &&
    typeof (entry as Record<string, unknown>).completed_quizzes === "number" &&
    typeof (entry as Record<string, unknown>).total_completed === "number"
  );
}

/**
 * Validates entire leaderboard response
 */
export function validateLeaderboardData(
  data: unknown,
): data is LeaderboardResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).success === "boolean" &&
    Array.isArray((data as Record<string, unknown>).leaderboard) &&
    ((data as Record<string, unknown>).leaderboard as unknown[]).every(isValidLeaderboardEntry)
  );
}
