import { jsx as _jsx } from "react/jsx-runtime";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "./Button";
export function ThemeSwitch({ className = "" }) {
    const { theme, toggleTheme } = useTheme();
    const icon = theme === "light" ? "🌙" : "☀️";
    const label = theme === "light" ? "Enable dark mode" : "Enable light mode";
    return (_jsx(Button, { onClick: toggleTheme, variant: "linkLight", "aria-label": label, title: label, className: className, children: icon }));
}
