import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "./LeaderboardPage.css";

interface LeaderboardEntry {
  rank: number;
  username: string;
  completed_videos: number;
  completed_quizzes: number;
  total_completed: number;
}

export function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/leaderboard");
        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard data.");
        }
        const data = await response.json();
        if (data.success) {
          setLeaderboard(data.leaderboard);
        } else {
          throw new Error(data.error || "An unknown error occurred.");
        }
      } catch (err: any) {
        console.warn("API not available - showing offline leaderboard");
        // Offline fallback - show mock data or empty state
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
        if (user?.username) {
          const userInList = mockLeaderboard.find(
            (entry) => entry.username === user.username,
          );
          if (!userInList) {
            mockLeaderboard.push({
              rank: mockLeaderboard.length + 1,
              username: user.username,
              completed_videos: 2,
              completed_quizzes: 1,
              total_completed: 3,
            });
          }
        }

        setLeaderboard(mockLeaderboard);
        setError("API unavailable - showing sample data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user?.username]);

  const userRank = leaderboard.find(
    (entry) => entry.username === user?.username,
  );

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p>See how you stack up against other AP Stat Park explorers!</p>
        <Link to="/dashboard" className="back-to-dashboard">
          ← Back to Dashboard
        </Link>
      </header>

      {isLoading && (
        <div className="loading-spinner">Loading leaderboard...</div>
      )}
      {error && (
        <div
          className={`error-message ${error.includes("sample data") ? "offline-notice" : ""}`}
        >
          {error.includes("sample data") ? "📱 " : "⚠️ "}
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="leaderboard-container">
          {userRank && (
            <div className="user-rank-highlight">
              <h3>Your Rank</h3>
              <div className="leaderboard-item current-user">
                <span className="rank">{userRank.rank}</span>
                <span className="username">{userRank.username} (You)</span>
                <span className="stat">📝 {userRank.completed_quizzes}</span>
                <span className="stat">📺 {userRank.completed_videos}</span>
                <span className="total-score">
                  {userRank.total_completed} Total
                </span>
              </div>
            </div>
          )}

          <div className="leaderboard-list">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`leaderboard-item ${entry.username === user?.username ? "current-user-dimmed" : ""}`}
              >
                <span className="rank">{entry.rank}</span>
                <span className="username">{entry.username}</span>
                <span className="stat">📝 {entry.completed_quizzes}</span>
                <span className="stat">📺 {entry.completed_videos}</span>
                <span className="total-score">
                  {entry.total_completed} Total
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
