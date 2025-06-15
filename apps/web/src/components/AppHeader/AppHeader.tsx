import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>🏞️ APStat&nbsp;Park</div>
      {isAuthenticated && (
        <nav className={styles.nav} aria-label="Primary">
          <Link
            to="/dashboard"
            className={location.pathname === "/dashboard" ? styles.active : ""}
          >
            Dashboard
          </Link>
          <Link
            to="/leaderboard"
            className={location.pathname === "/leaderboard" ? styles.active : ""}
          >
            🏆 Leaderboard
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </nav>
      )}
    </header>
  );
} 