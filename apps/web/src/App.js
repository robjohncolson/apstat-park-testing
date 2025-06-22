import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { BookmarkProvider, useBookmark } from "./context/BookmarkContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LessonPage } from "./pages/LessonPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { PageShell } from "./components/PageShell/PageShell";
import "./App.css";
import { exposeRailwayTest } from "./utils/railwayTest";
import { Spinner } from "./components/ui/Spinner";
import { MiningPuzzleModal } from "./components/MiningPuzzleModal/MiningPuzzleModal";
import { useBlockchain } from "./context/BlockchainProvider";
// Global Bookmark Star Component
function GlobalBookmarkStar() {
    const { activeBookmark, navigateToBookmark, clearBookmark } = useBookmark();
    if (!activeBookmark)
        return null;
    const handleClick = () => {
        const url = navigateToBookmark();
        if (url) {
            window.location.href = url; // Simple navigation for now
        }
    };
    const handleClear = (e) => {
        e.stopPropagation();
        clearBookmark();
    };
    return (_jsxs("div", { className: "global-bookmark-star", style: {
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#ffd700",
            color: "#333",
            padding: "0.5rem 1rem",
            borderRadius: "25px",
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9rem",
            fontWeight: 500,
        }, onClick: handleClick, title: `Go to bookmarked ${activeBookmark.item_type || "lesson"}: ${activeBookmark.item_title || activeBookmark.lesson_title}`, children: ["\u2B50 ", activeBookmark.item_title || activeBookmark.lesson_title, _jsx("button", { onClick: handleClear, style: {
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    padding: "0",
                    marginLeft: "0.25rem",
                }, title: "Clear bookmark", children: "\u00D7" })] }));
}
function App() {
    const { isAuthenticated, isLoading } = useAuth();
    const { isProposalRequired, puzzleData, submitPuzzleSolution } = useBlockchain();
    // Expose Railway test function for debugging
    useEffect(() => {
        exposeRailwayTest();
    }, []);
    if (isLoading) {
        return (_jsx("div", { className: "app loading", children: _jsxs(Spinner, { children: [_jsx("h1", { children: "\uD83C\uDFDE\uFE0F APStat Park" }), _jsx("p", { children: "Loading your learning journey..." })] }) }));
    }
    return (_jsx(ThemeProvider, { children: _jsx(BookmarkProvider, { children: _jsx(Router, { future: { v7_startTransition: true, v7_relativeSplatPath: true }, children: _jsxs("div", { className: "app", children: [isAuthenticated && _jsx(GlobalBookmarkStar, {}), _jsx(MiningPuzzleModal, { isOpen: isProposalRequired, puzzle: puzzleData, onSubmit: submitPuzzleSolution }), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: isAuthenticated ? (_jsx(Navigate, { to: "/dashboard", replace: true })) : (_jsx(PageShell, { fluid: true, children: _jsx(LoginPage, {}) })) }), _jsx(Route, { path: "/dashboard", element: isAuthenticated ? (_jsx(PageShell, { fluid: true, children: _jsx(DashboardPage, {}) })) : (_jsx(Navigate, { to: "/", replace: true })) }), _jsx(Route, { path: "/unit/:unitId/lesson/:lessonId", element: isAuthenticated ? (_jsx(PageShell, { fluid: true, children: _jsx(LessonPage, {}) })) : (_jsx(Navigate, { to: "/", replace: true })) }), _jsx(Route, { path: "/leaderboard", element: isAuthenticated ? (_jsx(PageShell, { fluid: true, children: _jsx(LeaderboardPage, {}) })) : (_jsx(Navigate, { to: "/", replace: true })) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] })] }) }) }) }));
}
export default App;
