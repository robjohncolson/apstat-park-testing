import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./AppHeader.module.css";
import { Button } from "../ui/Button";
import { ThemeSwitch } from "../ui/ThemeSwitch";
import { SyncStatus } from "../SyncStatus/SyncStatus";

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
          <Button
            to="/dashboard"
            variant="linkLight"
            className={location.pathname === "/dashboard" ? styles.active : ""}
          >
            Dashboard
          </Button>
          <Button
            to="/leaderboard"
            variant="linkLight"
            className={location.pathname === "/leaderboard" ? styles.active : ""}
          >
            🏆 Leaderboard
          </Button>
          <ThemeSwitch />
          <SyncStatus />
          <Button onClick={handleLogout} variant="danger">
            Logout
          </Button>
        </nav>
      )}
    </header>
  );
} 