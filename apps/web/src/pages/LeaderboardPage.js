import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from "../context/AuthContext";
import { useBlockchain } from "../context/BlockchainProvider";
import { Link } from "react-router-dom";
import styles from "./LeaderboardPage.module.css";
import { Spinner } from "../components/ui/Spinner";
export function LeaderboardPage() {
    const { user } = useAuth();
    const { leaderboardData, syncStatus } = useBlockchain();
    const isLoading = syncStatus === "syncing" || (syncStatus === "synced" && leaderboardData.length === 0);
    const userRank = leaderboardData.find((entry) => entry.username === user?.username);
    return (_jsxs("div", { className: styles.leaderboardPage, children: [_jsxs("header", { className: styles.leaderboardHeader, children: [_jsx("h1", { children: "\uD83C\uDFC6 Leaderboard" }), _jsx("p", { children: "See how you stack up against other AP Stat Park explorers!" }), _jsx(Link, { to: "/dashboard", className: styles.backToDashboard, children: "\u2190 Back to Dashboard" })] }), isLoading && _jsx(Spinner, { children: "Loading leaderboard..." }), !isLoading && (_jsxs("div", { className: styles.leaderboardContainer, children: [userRank && (_jsxs("div", { className: styles.userRankHighlight, children: [_jsx("h3", { children: "Your Rank" }), _jsxs("div", { className: `${styles.leaderboardItem} ${styles.currentUser}`, children: [_jsx("span", { className: styles.rank, children: userRank.rank }), _jsxs("span", { className: styles.username, children: [userRank.username, " (You)"] }), _jsxs("span", { className: styles.stat, children: ["\uD83D\uDCDD ", userRank.completed_quizzes] }), _jsxs("span", { className: styles.stat, children: ["\uD83D\uDCFA ", userRank.completed_videos] }), _jsxs("span", { className: styles.totalScore, children: [userRank.total_completed, " Total"] })] })] })), _jsx("div", { className: styles.leaderboardList, children: leaderboardData.map((entry) => (_jsxs("div", { className: `${styles.leaderboardItem} ${entry.username === user?.username ? styles.currentUserDimmed : ""}`, children: [_jsx("span", { className: styles.rank, children: entry.rank }), _jsx("span", { className: styles.username, children: entry.username }), _jsxs("span", { className: styles.stat, children: ["\uD83D\uDCDD ", entry.completed_quizzes] }), _jsxs("span", { className: styles.stat, children: ["\uD83D\uDCFA ", entry.completed_videos] }), _jsxs("span", { className: styles.totalScore, children: [entry.total_completed, " Total"] })] }, entry.rank))) })] }))] }));
}
