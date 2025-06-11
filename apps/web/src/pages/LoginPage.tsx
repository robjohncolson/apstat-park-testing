import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login, generateUsername, isLoading } = useAuth();
  const [suggestedUsername, setSuggestedUsername] = useState<string>('');
  const [customUsername, setCustomUsername] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateUsername = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const username = await generateUsername();
      setSuggestedUsername(username);
    } catch (error) {
      setError('Failed to generate username. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogin = async (username: string) => {
    if (!username.trim()) {
      setError('Please enter a username or generate one.');
      return;
    }

    setError('');
    try {
      await login(username.trim());
    } catch (error) {
      setError('Failed to log in. Please try again.');
    }
  };

  // Generate a username on mount
  useEffect(() => {
    handleGenerateUsername();
  }, []);

  return (
    <div className="login-page">
      <div className="login-container">
        <header className="login-header">
          <h1>🏞️ Welcome to APStat Park</h1>
          <p>Your journey through AP Statistics starts here!</p>
        </header>

        <div className="login-form">
          <h2>Choose Your Adventure Name</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="username-section">
            <h3>Suggested Username</h3>
            <div className="suggested-username">
              <div className="username-display">
                {isGenerating ? 'Generating...' : suggestedUsername || 'No username generated'}
              </div>
              <button 
                onClick={handleGenerateUsername}
                disabled={isGenerating}
                className="generate-btn"
              >
                {isGenerating ? 'Generating...' : 'Generate New'}
              </button>
            </div>
            
            {suggestedUsername && (
              <button
                onClick={() => handleLogin(suggestedUsername)}
                disabled={isLoading}
                className="login-btn primary"
              >
                {isLoading ? 'Logging in...' : `Continue as ${suggestedUsername}`}
              </button>
            )}
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="custom-username-section">
            <h3>Create Your Own Username</h3>
            <input
              type="text"
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              placeholder="Enter your preferred username"
              className="username-input"
              maxLength={30}
            />
            <button
              onClick={() => handleLogin(customUsername)}
              disabled={isLoading || !customUsername.trim()}
              className="login-btn secondary"
            >
              {isLoading ? 'Logging in...' : 'Continue with Custom Name'}
            </button>
          </div>

          <div className="login-info">
            <p>
              <strong>Note:</strong> Your username will be saved locally in your browser. 
              You can use the same name across different devices to sync your progress!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 