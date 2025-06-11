import { Link } from 'react-router-dom';

export function LeaderboardPage() {
  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>
        <h1>🏆 Leaderboard</h1>
        <p>See how you rank against other learners!</p>
      </header>

      <main className="leaderboard-main">
        <div className="coming-soon">
          <h2>🥇 Rankings Coming Soon!</h2>
          <p>The leaderboard will feature:</p>
          <ul>
            <li>🌟 Top performers by total stars earned</li>
            <li>🔥 Current learning streaks</li>
            <li>📈 Progress completion rates</li>
            <li>🎯 Weekly and monthly champions</li>
          </ul>
        </div>
      </main>
    </div>
  );
} 