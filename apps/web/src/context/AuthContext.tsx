/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { BlockchainService } from "../services/BlockchainService";

interface User {
  id: string;
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
    try {
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
          try {
            localStorage.removeItem("apstat-user");
          } catch {
            // Ignore localStorage removal errors
          }
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
    } catch (error) {
      // Handle localStorage access errors (e.g., in CI environments)
      console.warn("localStorage access denied, using default auth state:", error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const generateUsername = async (): Promise<string> => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${apiUrl}/api/generate-username`,
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

      // ------------------------------------------------------------------
      // Blockchain-backed user creation
      // ------------------------------------------------------------------

      // Ensure the blockchain layer is initialised (idempotent)
      const blockchainService = BlockchainService.getInstance();
      await blockchainService.initialize();

      // Submit CREATE_USER transaction (fire-and-forget)
      await blockchainService.submitTransaction("CREATE_USER", {
        username: finalUsername,
        createdAt: Date.now(),
      } as any);

      const publicKey = blockchainService.getPublicKey();

      const user = {
        // Store the public key under the existing `id` prop so downstream
        // components remain compatible during the migration.
        id: publicKey,
        username: finalUsername,
        created_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
      } as User;

      // Persist to localStorage so user remains logged-in after refresh
      try {
        localStorage.setItem("apstat-user", JSON.stringify(user));
      } catch (error) {
        console.warn("Failed to save user to localStorage:", error);
      }

      console.log("Login successful via blockchain, user:", user);
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
    try {
      localStorage.removeItem("apstat-user");
    } catch (error) {
      console.warn("Failed to remove user from localStorage:", error);
    }
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
