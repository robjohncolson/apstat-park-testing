import { jsx as _jsx } from "react/jsx-runtime";
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, } from "react";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [authState, setAuthState] = useState({
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
                }
                catch (error) {
                    console.error("Failed to parse saved user:", error);
                    try {
                        localStorage.removeItem("apstat-user");
                    }
                    catch {
                        // Ignore localStorage removal errors
                    }
                    setAuthState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                    });
                }
            }
            else {
                setAuthState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false,
                });
            }
        }
        catch (error) {
            // Handle localStorage access errors (e.g., in CI environments)
            console.warn("localStorage access denied, using default auth state:", error);
            setAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
            });
        }
    }, []);
    const generateUsername = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/generate-username`);
            const data = await response.json();
            return data.username;
        }
        catch (error) {
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
    const login = async (username) => {
        setAuthState((prev) => ({ ...prev, isLoading: true }));
        try {
            // Generate username if not provided
            const finalUsername = username || (await generateUsername());
            // Try to create user via API, but fall back to offline mode if it fails
            let user;
            try {
                const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const response = await fetch(`${apiUrl}/api/users/get-or-create`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username: finalUsername }),
                });
                if (response.ok) {
                    const data = await response.json();
                    user = data.user;
                    console.log("Login successful with API, user data:", user);
                }
                else {
                    throw new Error("API call failed");
                }
            }
            catch {
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
            try {
                localStorage.setItem("apstat-user", JSON.stringify(user));
            }
            catch (error) {
                console.warn("Failed to save user to localStorage:", error);
            }
            console.log("Setting authenticated state to true");
            setAuthState({
                user,
                isLoading: false,
                isAuthenticated: true,
            });
        }
        catch (error) {
            console.error("Login failed:", error);
            setAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
            });
            throw error;
        }
    };
    const logout = () => {
        try {
            localStorage.removeItem("apstat-user");
        }
        catch (error) {
            console.warn("Failed to remove user from localStorage:", error);
        }
        setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
        });
    };
    const value = {
        ...authState,
        login,
        logout,
        generateUsername,
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
