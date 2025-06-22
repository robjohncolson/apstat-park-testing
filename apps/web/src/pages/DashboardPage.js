import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// @ts-nocheck
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ALL_UNITS_DATA, getTotalItemCounts, calculateTotalFractionalLessons, calculateTopicFraction, } from "../data/allUnitsData";
import { PaceTracker } from "../components/PaceTracker";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import styles from "./DashboardPage.module.css";
export function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [progress, setProgress] = useState([]);
    const handleLogout = () => {
        logout();
        // Now navigate using React Router since AuthContext will update the App component
        navigate("/", { replace: true });
    };
    // Fetch user progress on component mount
    useEffect(() => {
        const fetchProgress = async () => {
            if (!user?.id) {
                return;
            }
            try {
                const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const response = await fetch(`${apiUrl}/api/users/${user.id}/progress`);
                if (response.ok) {
                    const progressData = await response.json();
                    setProgress(progressData);
                }
                else {
                    console.warn("Failed to fetch progress - running in offline mode");
                    // In offline mode, use localStorage for demo purposes
                    const offlineProgress = localStorage.getItem(`progress_${user.id}`);
                    if (offlineProgress) {
                        setProgress(JSON.parse(offlineProgress));
                    }
                    else {
                        // TEMPORARY TEST DATA: Simulate having completed 2 lessons to test pace tracking
                        const testProgress = [
                            {
                                lesson_id: "exploring-data",
                                videos_watched: [0, 1, 2],
                                quizzes_completed: [0, 1],
                                lesson_completed: true,
                                completion_date: new Date().toISOString(),
                            },
                            {
                                lesson_id: "categorical-vs-quantitative",
                                videos_watched: [0, 1],
                                quizzes_completed: [0],
                                lesson_completed: true,
                                completion_date: new Date().toISOString(),
                            },
                        ];
                        setProgress(testProgress);
                    }
                }
            }
            catch {
                console.warn("API not available - running in offline mode");
                // In offline mode, use localStorage for demo purposes
                const offlineProgress = localStorage.getItem(`progress_${user.id}`);
                if (offlineProgress) {
                    setProgress(JSON.parse(offlineProgress));
                }
                else {
                    // TEMPORARY TEST DATA: Simulate having completed 2 lessons to test pace tracking
                    const testProgress = [
                        {
                            lesson_id: "exploring-data",
                            videos_watched: [0, 1, 2],
                            quizzes_completed: [0, 1],
                            lesson_completed: true,
                            completion_date: new Date().toISOString(),
                        },
                        {
                            lesson_id: "categorical-vs-quantitative",
                            videos_watched: [0, 1],
                            quizzes_completed: [0],
                            lesson_completed: true,
                            completion_date: new Date().toISOString(),
                        },
                    ];
                    setProgress(testProgress);
                }
            }
        };
        fetchProgress();
    }, [user?.id]);
    // Helper function to get granular progress for a topic
    const getTopicProgress = (topicId) => {
        const topicProgress = progress.find((p) => p.lesson_id === topicId);
        return {
            videosWatched: topicProgress?.videos_watched || [],
            quizzesCompleted: topicProgress?.quizzes_completed || [],
            blooketCompleted: topicProgress?.blooket_completed || false,
            origamiCompleted: topicProgress?.origami_completed || false,
        };
    };
    // Calculate overall progress statistics
    const calculateStats = () => {
        const { totalVideos, totalQuizzes } = getTotalItemCounts(ALL_UNITS_DATA);
        // Phase 1: Use fractional lesson calculation
        const allTopics = ALL_UNITS_DATA.flatMap((unit) => unit.topics);
        const completedLessons = calculateTotalFractionalLessons(allTopics, progress);
        const totalLessons = ALL_UNITS_DATA.reduce((acc, unit) => acc + unit.topics.length, 0);
        return {
            completedLessons,
            totalLessons,
            totalVideos,
            totalQuizzes,
            completionPercentage: totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0,
        };
    };
    const stats = calculateStats();
    return (_jsx("div", { className: styles.dashboardContainer, children: _jsxs("main", { children: [_jsxs("h1", { children: ["Welcome, ", user?.username || "Explorer", "!"] }), _jsx("p", { children: "Your journey to mastering AP Statistics starts here." }), _jsxs("section", { className: "dashboard-overview", children: [_jsx("h2", { children: "Your Learning Journey" }), _jsx(ErrorBoundary, { componentName: "Pace Tracker", children: _jsx(PaceTracker, { completedLessons: stats.completedLessons, totalLessons: stats.totalLessons }) }), _jsxs("div", { className: "progress-overview", children: [_jsx("div", { className: "progress-bar", children: _jsx("div", { className: "progress-fill", style: { width: `${stats.completionPercentage}%` } }) }), _jsxs("p", { children: [stats.completedLessons.toFixed(2), " of ", stats.totalLessons, " ", "lessons completed (", stats.completionPercentage.toFixed(2), "%)"] })] }), _jsx("div", { className: "units-container", children: ALL_UNITS_DATA.map((unit) => (_jsx(UnitAccordion, { unit: unit, getTopicProgress: getTopicProgress }, unit.unitId))) })] }), _jsxs("section", { className: "quick-stats", children: [_jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Progress" }), _jsxs("p", { children: [stats.completionPercentage.toFixed(2), "% Complete"] }), _jsxs("small", { children: [stats.completedLessons.toFixed(2), "/", stats.totalLessons, " lessons"] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Content" }), _jsxs("p", { children: [stats.totalVideos, " Videos"] }), _jsxs("small", { children: [stats.totalQuizzes, " Quizzes"] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Next Lesson" }), _jsx("p", { children: stats.completedLessons < stats.totalLessons
                                        ? "Ready to continue!"
                                        : "All done! 🎉" })] })] })] }) }));
}
function UnitAccordion({ unit, getTopicProgress }) {
    const [isExpanded, setIsExpanded] = useState(false);
    // Phase 1: Use fractional progress calculation for more accurate unit progress
    const unitFractionalProgress = unit.topics.reduce((total, topic) => {
        const topicProgress = getTopicProgress(topic.id);
        const userProgress = {
            videos_watched: topicProgress.videosWatched,
            quizzes_completed: topicProgress.quizzesCompleted,
            blooket_completed: topicProgress.blooketCompleted,
            origami_completed: topicProgress.origamiCompleted,
        };
        return total + calculateTopicFraction(topic, userProgress);
    }, 0);
    const totalTopics = unit.topics.length;
    const unitProgress = totalTopics > 0
        ? Math.round((unitFractionalProgress / totalTopics) * 100)
        : 0;
    return (_jsxs("div", { className: "unit-accordion", children: [_jsxs("div", { className: "unit-header", onClick: () => setIsExpanded(!isExpanded), role: "button", tabIndex: 0, onKeyDown: (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        setIsExpanded(!isExpanded);
                    }
                }, children: [_jsxs("div", { className: "unit-info", children: [_jsx("h3", { children: unit.displayName }), _jsxs("p", { className: "unit-weight", children: ["Exam Weight: ", unit.examWeight] }), _jsxs("div", { className: "unit-progress", children: [_jsx("div", { className: "progress-bar small", children: _jsx("div", { className: "progress-fill", style: { width: `${unitProgress}%` } }) }), _jsxs("span", { children: [unitFractionalProgress.toFixed(2), "/", totalTopics, " topics"] })] })] }), _jsx("div", { className: "expand-icon", children: isExpanded ? "−" : "+" })] }), isExpanded && (_jsx("div", { className: "topics-list", children: unit.topics.map((topic) => (_jsx(TopicItem, { topic: topic, unitId: unit.unitId, progress: getTopicProgress(topic.id), topicData: topic }, topic.id))) }))] }));
}
function TopicItem({ topic, unitId, progress, topicData }) {
    const videosCount = topic.videos.length;
    const quizzesCount = topic.quizzes.length;
    const videosWatchedCount = progress.videosWatched.length;
    const quizzesCompletedCount = progress.quizzesCompleted.length;
    // Calculate fractional completion for this topic
    const userProgress = {
        videos_watched: progress.videosWatched,
        quizzes_completed: progress.quizzesCompleted,
        blooket_completed: progress.blooketCompleted,
        origami_completed: progress.origamiCompleted,
    };
    const topicFraction = calculateTopicFraction(topicData, userProgress);
    const completionPercentage = Math.round(topicFraction * 100);
    const isCompleted = topicFraction === 1.0;
    return (_jsx("div", { className: `topic-item ${isCompleted ? "completed" : ""}`, children: _jsxs(Link, { to: `/unit/${unitId}/lesson/${topic.id}`, className: "topic-link", children: [_jsxs("div", { className: "topic-content", children: [_jsxs("div", { className: "topic-header", children: [_jsx("h4", { children: topic.name }), _jsx("div", { className: "topic-completion", children: isCompleted ? (_jsx("span", { className: "completed-checkmark", children: "\u2705 100%" })) : (_jsxs("span", { className: `completion-percentage ${completionPercentage > 0 ? "in-progress" : ""}`, children: [completionPercentage, "%"] })) })] }), _jsx("p", { className: "topic-description", children: topic.description }), _jsxs("div", { className: "topic-meta", children: [videosCount > 0 && (_jsxs("span", { className: "content-count", children: ["\uD83D\uDCFA ", videosWatchedCount, "/", videosCount] })), quizzesCount > 0 && (_jsxs("span", { className: "content-count", children: ["\uD83D\uDCDD ", quizzesCompletedCount, "/", quizzesCount] })), topic.blooket.url && (_jsxs("span", { className: "content-count", children: ["\uD83C\uDFAE ", progress.blooketCompleted ? "✓" : "✗"] })), topic.origami && (_jsxs("span", { className: "content-count", children: ["\uD83C\uDFA8 ", progress.origamiCompleted ? "✓" : "✗"] }))] })] }), _jsx("div", { className: "topic-arrow", children: "\u2192" })] }) }));
}
