import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const { login, generateUsername, isLoading } = useAuth();
  const navigate = useNavigate();
  const [suggestedUsername, setSuggestedUsername] = useState<string>("");
  const [customUsername, setCustomUsername] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateUsername = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const username = await generateUsername();
      setSuggestedUsername(username);
    } catch {
      setError("Failed to generate username. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogin = async (username: string) => {
    if (!username.trim()) {
      setError("Please enter a username or generate one.");
      return;
    }

    setError("");
    try {
      console.log("About to call login...");
      await login(username.trim());
      console.log("Login successful, about to navigate...");
      // Now navigate using React Router since AuthContext will update the App component
      navigate("/dashboard", { replace: true });
      console.log("Navigate called");
    } catch (error) {
      console.error("Login error:", error);
      setError("Failed to log in. Please try again.");
    }
  };

  // Generate a username on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    handleGenerateUsername();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <header className={styles.loginHeader}>
          <h1>🏞️ Welcome to APStat Park</h1>
          <p>Your journey through AP Statistics starts here!</p>
        </header>

        <div className={styles.loginForm}>
          <h2>Choose Your Adventure Name</h2>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.usernameSection}>
            <h3>Suggested Username</h3>
            <div className={styles.suggestedUsername}>
              <div className={styles.usernameDisplay}>
                {isGenerating
                  ? "Generating..."
                  : suggestedUsername || "No username generated"}
              </div>
              <button
                onClick={handleGenerateUsername}
                disabled={isGenerating}
                className={styles.generateBtn}
              >
                {isGenerating ? "Generating..." : "Generate New"}
              </button>
            </div>

            {suggestedUsername && (
              <button
                onClick={() => handleLogin(suggestedUsername)}
                disabled={isLoading}
                className={`${styles.loginBtn} ${styles.primary}`}
              >
                {isLoading
                  ? "Logging in..."
                  : `Continue as ${suggestedUsername}`}
              </button>
            )}
          </div>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <div className={styles.customUsernameSection}>
            <h3>Create Your Own Username</h3>
            <input
              type="text"
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              placeholder="Enter your preferred username"
              className={styles.usernameInput}
              maxLength={30}
            />
            <button
              onClick={() => handleLogin(customUsername)}
              disabled={isLoading || !customUsername.trim()}
              className={`${styles.loginBtn} ${styles.secondary}`}
            >
              {isLoading ? "Logging in..." : "Continue with Custom Name"}
            </button>
          </div>

          <div className={styles.loginInfo}>
            <p>
              <strong>Note:</strong> Your username will be saved locally in your
              browser. You can use the same name across different devices to
              sync your progress!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
