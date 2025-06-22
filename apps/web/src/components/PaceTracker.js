import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePaceTracker } from "../hooks/usePaceTracker";
import { CountdownTimer } from "./ui/CountdownTimer";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import styles from "./PaceTracker.module.css";
function PaceTrackerContent({ completedLessons, totalLessons, examDate, className = "", onLessonComplete, }) {
    const { user, isAuthenticated } = useAuth();
    // Use the new backend-integrated hook
    const { paceData, metrics, isLoading, isError, error, updatePace, isUpdating, updateError, isDisabled, currentDeadline, bufferHours, 
    // hoursUntilDeadline, // Unused variable
    isOverdue, } = usePaceTracker({
        completedLessons,
        totalLessons,
        examDate,
        enabled: isAuthenticated,
    });
    // Update pace when completedLessons changes
    useEffect(() => {
        if (!isDisabled && paceData) {
            const lessonsDelta = Math.floor(completedLessons) - Math.floor(paceData.lastCompletedLessons);
            if (lessonsDelta > 0) {
                updatePace({
                    completedLessons,
                    totalLessons,
                    examDate,
                }).then(() => {
                    onLessonComplete?.();
                }).catch((err) => {
                    console.error('Failed to update pace:', err);
                });
            }
        }
    }, [completedLessons, totalLessons, examDate, updatePace, isDisabled, paceData, onLessonComplete]);
    // Handle non-authenticated users
    if (!isAuthenticated || isDisabled) {
        return (_jsxs("div", { className: `${styles.paceTracker} ${styles.disabled} ${className}`, children: [_jsxs("div", { className: styles.header, children: [_jsx("h3", { className: styles.title, children: "\uD83D\uDCCA Pace Tracker" }), _jsx("div", { className: styles.status, children: _jsx("span", { className: styles.statusText, children: "Disabled" }) })] }), _jsx("div", { className: styles.content, children: _jsxs("div", { className: styles.disabledMessage, children: [_jsx("p", { children: "\uD83D\uDD10 Please log in to track your pace" }), _jsx("p", { className: styles.hint, children: "Pace tracking helps you stay on schedule for the AP Statistics exam" })] }) })] }));
    }
    // Loading state
    if (isLoading) {
        return (_jsxs("div", { className: `${styles.paceTracker} ${styles.loading} ${className}`, children: [_jsxs("div", { className: styles.header, children: [_jsx("h3", { className: styles.title, children: "\uD83D\uDCCA Pace Tracker" }), _jsx("div", { className: styles.status, children: _jsx("span", { className: styles.statusText, children: "Loading..." }) })] }), _jsx("div", { className: styles.content, children: _jsxs("div", { className: styles.loadingSpinner, children: [_jsx("div", { className: styles.spinner }), _jsx("p", { children: "Loading your pace data..." })] }) })] }));
    }
    // Error state
    if (isError || updateError) {
        const errorMessage = error?.message || updateError?.message || 'Unknown error';
        const isBackendDown = errorMessage.includes('Backend API is not running');
        return (_jsxs("div", { className: `${styles.paceTracker} ${styles.error} ${className}`, children: [_jsxs("div", { className: styles.header, children: [_jsx("h3", { className: styles.title, children: "\uD83D\uDCCA Pace Tracker" }), _jsx("div", { className: styles.status, children: _jsx("span", { className: styles.statusText, children: isBackendDown ? 'Backend Offline' : 'Error' }) })] }), _jsx("div", { className: styles.content, children: _jsxs("div", { className: styles.errorMessage, children: [_jsx("p", { children: isBackendDown ? '🔌 Backend API is offline' : '⚠️ Unable to load pace data' }), isBackendDown ? (_jsxs("div", { children: [_jsx("p", { className: styles.hint, children: "To enable pace tracking, start the API server:" }), _jsx("p", { className: styles.errorDetails, children: "cd apps/api && npm run dev" }), _jsx("p", { className: styles.hint, children: "Or continue using the app without pace tracking" })] })) : (_jsxs("div", { children: [_jsx("p", { className: styles.errorDetails, children: errorMessage }), _jsx("p", { className: styles.hint, children: "Please check your connection and try refreshing the page" })] }))] }) })] }));
    }
    // No metrics available
    if (!metrics) {
        return (_jsxs("div", { className: `${styles.paceTracker} ${styles.noData} ${className}`, children: [_jsxs("div", { className: styles.header, children: [_jsx("h3", { className: styles.title, children: "\uD83D\uDCCA Pace Tracker" }), _jsx("div", { className: styles.status, children: _jsx("span", { className: styles.statusText, children: "No Data" }) })] }), _jsx("div", { className: styles.content, children: _jsx("div", { className: styles.noDataMessage, children: _jsx("p", { children: "\uD83D\uDCC8 Start completing lessons to track your pace!" }) }) })] }));
    }
    // Determine status styling
    const getStatusClass = () => {
        if (isOverdue)
            return styles.overdue;
        if (metrics.paceStatus === 'ahead')
            return styles.ahead;
        if (metrics.paceStatus === 'on-track')
            return styles.onTrack;
        if (metrics.paceStatus === 'behind')
            return styles.behind;
        return '';
    };
    const getStatusIcon = () => {
        if (isOverdue)
            return '🔴';
        if (metrics.paceStatus === 'ahead')
            return '🟢';
        if (metrics.paceStatus === 'on-track')
            return '🟡';
        if (metrics.paceStatus === 'behind')
            return '🟠';
        return '⚪';
    };
    const getStatusText = () => {
        if (isOverdue)
            return 'Overdue';
        if (isUpdating)
            return 'Updating...';
        return metrics.paceStatus === 'on-track' ? 'On Track' :
            metrics.paceStatus.charAt(0).toUpperCase() + metrics.paceStatus.slice(1);
    };
    const getEncouragementMessage = () => {
        const progress = completedLessons / totalLessons;
        if (progress >= 0.9)
            return "🎉 Almost there! You're doing great!";
        if (progress >= 0.75)
            return "💪 Keep up the excellent work!";
        if (progress >= 0.5)
            return "🚀 You're making solid progress!";
        if (progress >= 0.25)
            return "📚 Great start! Keep it up!";
        return "🌟 Every lesson gets you closer to success!";
    };
    return (_jsxs("div", { "data-testid": "pace-tracker-component", className: `${styles.paceTracker} ${getStatusClass()} ${className}`, children: [_jsxs("div", { className: styles.header, children: [_jsx("h3", { className: styles.title, children: "\uD83D\uDCCA Pace Tracker" }), _jsxs("div", { className: styles.status, children: [_jsx("span", { className: styles.statusIcon, children: getStatusIcon() }), _jsx("span", { className: styles.statusText, children: getStatusText() })] })] }), _jsxs("div", { className: styles.content, children: [_jsxs("div", { className: styles.progressSection, children: [_jsx("div", { className: styles.progressBar, children: _jsx("div", { className: styles.progressFill, style: { width: `${(completedLessons / totalLessons) * 100}%` } }) }), _jsxs("div", { className: styles.progressText, children: [completedLessons.toFixed(1), " / ", totalLessons, " lessons (", ((completedLessons / totalLessons) * 100).toFixed(1), "%)"] })] }), currentDeadline && (_jsxs("div", { className: styles.deadlineSection, children: [_jsx("p", { className: styles.sectionLabel, children: "Next Lesson Deadline:" }), _jsx(CountdownTimer, { deadline: currentDeadline, className: styles.countdown })] })), bufferHours > 0 && (_jsxs("div", { className: styles.bufferSection, children: [_jsx("p", { className: styles.sectionLabel, children: "Time Buffer:" }), _jsxs("div", { className: styles.bufferDisplay, children: [_jsxs("span", { className: styles.bufferAmount, children: ["+", bufferHours.toFixed(1), " hours"] }), _jsxs("span", { className: styles.bufferDescription, children: ["(", (bufferHours / 24).toFixed(1), " days ahead)"] })] })] })), _jsxs("div", { className: styles.metricsSection, children: [_jsxs("div", { className: styles.metricRow, children: [_jsx("span", { className: styles.metricLabel, children: "Days until exam:" }), _jsx("span", { className: styles.metricValue, children: metrics.daysUntilExam })] }), _jsxs("div", { className: styles.metricRow, children: [_jsx("span", { className: styles.metricLabel, children: "Lessons remaining:" }), _jsx("span", { className: styles.metricValue, children: metrics.lessonsRemaining })] }), _jsxs("div", { className: styles.metricRow, children: [_jsx("span", { className: styles.metricLabel, children: "Target pace:" }), _jsxs("span", { className: styles.metricValue, children: [metrics.targetLessonsPerDay.toFixed(2), " lessons/day"] })] })] }), _jsx("div", { className: styles.encouragementSection, children: _jsx("p", { className: styles.encouragementText, children: getEncouragementMessage() }) }), _jsx("div", { className: styles.userInfo, children: _jsxs("span", { className: styles.userText, children: ["\uD83D\uDCDD Tracking progress for ", user?.username] }) })] })] }));
}
export function PaceTracker(props) {
    return (_jsx(ErrorBoundary, { fallback: _jsxs("div", { className: `${styles.paceTracker} ${styles.error} ${props.className || ""}`, children: [_jsxs("div", { className: styles.header, children: [_jsx("h3", { className: styles.title, children: "\uD83D\uDCCA Pace Tracker" }), _jsx("div", { className: styles.status, children: _jsx("span", { className: styles.statusText, children: "Error" }) })] }), _jsx("div", { className: styles.content, children: _jsxs("div", { className: styles.errorMessage, children: [_jsx("p", { children: "\u26A0\uFE0F Pace Tracker encountered an error" }), _jsx("p", { className: styles.hint, children: "Please refresh the page to try again" })] }) })] }), children: _jsx(PaceTrackerContent, { ...props }) }));
}
