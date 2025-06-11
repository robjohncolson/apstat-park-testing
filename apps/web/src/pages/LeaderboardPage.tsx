import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './LeaderboardPage.css';

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
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data.');
        }
        const data = await response.json();
        if (data.success) {
          setLeaderboard(data.leaderboard);
        } else {
          throw new Error(data.error || 'An unknown error occurred.');
        }
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const userRank = leaderboard.find(entry => entry.username === user?.username);

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p>See how you stack up against other AP Stat Park explorers!</p>
        <Link to="/dashboard" className="back-to-dashboard">← Back to Dashboard</Link>
      </header>

      {isLoading && <div className="loading-spinner">Loading leaderboard...</div>}
      {error && <div className="error-message">Error: {error}</div>}

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
                <span className="total-score">{userRank.total_completed} Total</span>
              </div>
            </div>
          )}
          
          <div className="leaderboard-list">
            {leaderboard.map((entry) => (
              <div 
                key={entry.rank} 
                className={`leaderboard-item ${entry.username === user?.username ? 'current-user-dimmed' : ''}`}
              >
                <span className="rank">{entry.rank}</span>
                <span className="username">{entry.username}</span>
                <span className="stat">📝 {entry.completed_quizzes}</span>
                <span className="stat">📺 {entry.completed_videos}</span>
                <span className="total-score">{entry.total_completed} Total</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 