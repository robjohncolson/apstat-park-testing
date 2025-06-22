import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
const ThemeContext = createContext(undefined);
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("apstat-theme") || "light";
        }
        return "light";
    });
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("apstat-theme", theme);
    }, [theme]);
    const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
    return (_jsx(ThemeContext.Provider, { value: { theme, toggleTheme }, children: children }));
};
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return ctx;
}
