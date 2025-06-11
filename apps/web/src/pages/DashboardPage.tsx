import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="user-info">
          <h1>🏞️ APStat Park Dashboard</h1>
          <p>Welcome back, <strong>{user?.username}</strong>!</p>
        </div>
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-overview">
          <h2>Your Learning Journey</h2>
          <div className="coming-soon">
            <p>📚 Course units and lessons will appear here soon!</p>
            <p>We're setting up your personalized learning experience...</p>
          </div>
        </section>

        <section className="quick-stats">
          <div className="stat-card">
            <h3>Progress</h3>
            <p>Coming soon...</p>
          </div>
          <div className="stat-card">
            <h3>Streak</h3>
            <p>Coming soon...</p>
          </div>
          <div className="stat-card">
            <h3>Next Lesson</h3>
            <p>Coming soon...</p>
          </div>
        </section>
      </main>
    </div>
  );
} 