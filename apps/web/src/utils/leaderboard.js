/**
 * Fetches leaderboard data from the API
 * Returns both API data and offline fallback data
 */
export async function fetchLeaderboardData(currentUsername) {
    try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const fullUrl = `${apiUrl}/api/leaderboard`;
        console.log('API Base URL:', apiUrl);
        console.log('Full API URL:', fullUrl);
        const response = await fetch(fullUrl);
        if (!response.ok) {
            throw new Error("Failed to fetch leaderboard data.");
        }
        const data = await response.json();
        if (data.success) {
            return {
                leaderboard: data.leaderboard,
                isOffline: false,
                error: null,
            };
        }
        else {
            throw new Error(data.error || "An unknown error occurred.");
        }
    }
    catch {
        console.warn("API not available - showing offline leaderboard");
        // Offline fallback - show mock data
        const mockLeaderboard = [
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
            const userInList = mockLeaderboard.find((entry) => entry.username === currentUsername);
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
export function findUserRank(leaderboard, username) {
    if (!username)
        return undefined;
    return leaderboard.find((entry) => entry.username === username);
}
/**
 * Validates leaderboard entry data structure
 */
export function isValidLeaderboardEntry(entry) {
    return (typeof entry === "object" &&
        entry !== null &&
        typeof entry.rank === "number" &&
        typeof entry.username === "string" &&
        typeof entry.completed_videos === "number" &&
        typeof entry.completed_quizzes === "number" &&
        typeof entry.total_completed === "number");
}
/**
 * Validates entire leaderboard response
 */
export function validateLeaderboardData(data) {
    return (typeof data === "object" &&
        data !== null &&
        typeof data.success === "boolean" &&
        Array.isArray(data.leaderboard) &&
        data.leaderboard.every(isValidLeaderboardEntry));
}
