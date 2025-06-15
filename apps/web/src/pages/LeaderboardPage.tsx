import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import styles from "./LeaderboardPage.module.css";
import { Spinner } from "../components/ui/Spinner";

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
      } catch {
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
    <div className={styles.leaderboardPage}>
      <header className={styles.leaderboardHeader}>
        <h1>🏆 Leaderboard</h1>
        <p>See how you stack up against other AP Stat Park explorers!</p>
        <Link to="/dashboard" className={styles.backToDashboard}>
          ← Back to Dashboard
        </Link>
      </header>

      {isLoading && <Spinner>Loading leaderboard...</Spinner>}
      {error && (
        <div
          className={`${styles.errorMessage} ${error.includes("sample data") ? styles.offlineNotice : ""}`}
        >
          {error.includes("sample data") ? "📱 " : "⚠️ "}
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className={styles.leaderboardContainer}>
          {userRank && (
            <div className={styles.userRankHighlight}>
              <h3>Your Rank</h3>
              <div className={`${styles.leaderboardItem} ${styles.currentUser}`}>
                <span className={styles.rank}>{userRank.rank}</span>
                <span className={styles.username}>{userRank.username} (You)</span>
                <span className={styles.stat}>📝 {userRank.completed_quizzes}</span>
                <span className={styles.stat}>📺 {userRank.completed_videos}</span>
                <span className={styles.totalScore}>{userRank.total_completed} Total</span>
              </div>
            </div>
          )}

          <div className={styles.leaderboardList}>
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`${styles.leaderboardItem} ${entry.username === user?.username ? styles.currentUserDimmed : ""}`}
              >
                <span className={styles.rank}>{entry.rank}</span>
                <span className={styles.username}>{entry.username}</span>
                <span className={styles.stat}>📝 {entry.completed_quizzes}</span>
                <span className={styles.stat}>📺 {entry.completed_videos}</span>
                <span className={styles.totalScore}>{entry.total_completed} Total</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
