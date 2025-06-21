import { useAuth } from "../context/AuthContext";
import { useBlockchain } from "../context/BlockchainProvider";
import { Link } from "react-router-dom";
import styles from "./LeaderboardPage.module.css";
import { Spinner } from "../components/ui/Spinner";

export function LeaderboardPage() {
  const { user } = useAuth();
  const { leaderboardData, syncStatus } = useBlockchain();

  const isLoading = syncStatus === "syncing" || (syncStatus === "synced" && leaderboardData.length === 0);

  const userRank = leaderboardData.find(
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

      {!isLoading && (
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
            {leaderboardData.map((entry) => (
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
