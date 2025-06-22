import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("header", { className: styles.header, children: [_jsx("div", { className: styles.brand, children: "\uD83C\uDFDE\uFE0F APStat\u00A0Park" }), isAuthenticated && (_jsxs("nav", { className: styles.nav, "aria-label": "Primary", children: [_jsx(Button, { to: "/dashboard", variant: "linkLight", className: location.pathname === "/dashboard" ? styles.active : "", children: "Dashboard" }), _jsx(Button, { to: "/leaderboard", variant: "linkLight", className: location.pathname === "/leaderboard" ? styles.active : "", children: "\uD83C\uDFC6 Leaderboard" }), _jsx(ThemeSwitch, {}), _jsx(SyncStatus, {}), _jsx(Button, { onClick: handleLogout, variant: "danger", children: "Logout" })] }))] }));
}
