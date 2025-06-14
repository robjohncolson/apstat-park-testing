/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface User {
  id: number;
  username: string;
  created_at: string;
  last_sync: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (username?: string) => Promise<void>;
  logout: () => void;
  generateUsername: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("apstat-user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem("apstat-user");
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } else {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const generateUsername = async (): Promise<string> => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/generate-username",
      );
      const data = await response.json();
      return data.username;
    } catch (error) {
      console.error("Failed to generate username:", error);
      // Fallback to client-side generation
      const adjectives = ["happy", "clever", "bright", "swift", "calm"];
      const animals = ["panda", "fox", "owl", "cat", "wolf"];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const animal = animals[Math.floor(Math.random() * animals.length)];
      const num = Math.floor(Math.random() * 100);
      return `${adj}${animal}${num}`;
    }
  };

  const login = async (username?: string): Promise<void> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Generate username if not provided
      const finalUsername = username || (await generateUsername());

      // Try to create user via API, but fall back to offline mode if it fails
      let user;
      try {
        const response = await fetch(
          "http://localhost:3000/api/users/get-or-create",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username: finalUsername }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          user = data.user;
          console.log("Login successful with API, user data:", user);
        } else {
          throw new Error("API call failed");
        }
      } catch {
        // Fallback to offline mode
        console.log("API unavailable, using offline mode");
        user = {
          id: Math.floor(Math.random() * 10000),
          username: finalUsername,
          created_at: new Date().toISOString(),
          last_sync: new Date().toISOString(),
        };
        console.log("Login successful in offline mode, user data:", user);
      }

      // Save to localStorage
      localStorage.setItem("apstat-user", JSON.stringify(user));

      console.log("Setting authenticated state to true");
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error("Login failed:", error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  };

  const logout = (): void => {
    localStorage.removeItem("apstat-user");
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    generateUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
