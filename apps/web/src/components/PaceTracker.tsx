import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePaceTracker } from "../hooks/usePaceTracker";
import { CountdownTimer } from "./ui/CountdownTimer";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import styles from "./PaceTracker.module.css";

interface PaceTrackerProps {
  completedLessons: number;
  totalLessons: number;
  examDate?: string;
  className?: string;
  onLessonComplete?: () => void;
}

function PaceTrackerContent({ 
  completedLessons, 
  totalLessons, 
  examDate,
  className = "",
  onLessonComplete,
}: PaceTrackerProps) {
  const { user, isAuthenticated } = useAuth();

  // Use the new backend-integrated hook
  const {
    paceData,
    metrics,
    isLoading,
    isError,
    error,
    updatePace,
    isUpdating,
    updateError,
    isDisabled,
    currentDeadline,
    bufferHours,
    // hoursUntilDeadline, // Unused variable
    isOverdue,
  } = usePaceTracker({
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
    return (
      <div className={`${styles.paceTracker} ${styles.disabled} ${className}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>📊 Pace Tracker</h3>
          <div className={styles.status}>
            <span className={styles.statusText}>Disabled</span>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.disabledMessage}>
            <p>🔐 Please log in to track your pace</p>
            <p className={styles.hint}>
              Pace tracking helps you stay on schedule for the AP Statistics exam
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`${styles.paceTracker} ${styles.loading} ${className}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>📊 Pace Tracker</h3>
          <div className={styles.status}>
            <span className={styles.statusText}>Loading...</span>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p>Loading your pace data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || updateError) {
    const errorMessage = error?.message || updateError?.message || 'Unknown error';
    const isBackendDown = errorMessage.includes('Backend API is not running');
    
    return (
      <div className={`${styles.paceTracker} ${styles.error} ${className}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>📊 Pace Tracker</h3>
          <div className={styles.status}>
            <span className={styles.statusText}>{isBackendDown ? 'Backend Offline' : 'Error'}</span>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.errorMessage}>
            <p>{isBackendDown ? '🔌 Backend API is offline' : '⚠️ Unable to load pace data'}</p>
            {isBackendDown ? (
              <div>
                <p className={styles.hint}>
                  To enable pace tracking, start the API server:
                </p>
                <p className={styles.errorDetails}>cd apps/api && npm run dev</p>
                <p className={styles.hint}>
                  Or continue using the app without pace tracking
                </p>
              </div>
            ) : (
              <div>
                <p className={styles.errorDetails}>{errorMessage}</p>
                <p className={styles.hint}>
                  Please check your connection and try refreshing the page
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No metrics available
  if (!metrics) {
    return (
      <div className={`${styles.paceTracker} ${styles.noData} ${className}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>📊 Pace Tracker</h3>
          <div className={styles.status}>
            <span className={styles.statusText}>No Data</span>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.noDataMessage}>
            <p>📈 Start completing lessons to track your pace!</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine status styling
  const getStatusClass = () => {
    if (isOverdue) return styles.overdue;
    if (metrics.paceStatus === 'ahead') return styles.ahead;
    if (metrics.paceStatus === 'on-track') return styles.onTrack;
    if (metrics.paceStatus === 'behind') return styles.behind;
    return '';
  };

  const getStatusIcon = () => {
    if (isOverdue) return '🔴';
    if (metrics.paceStatus === 'ahead') return '🟢';
    if (metrics.paceStatus === 'on-track') return '🟡';
    if (metrics.paceStatus === 'behind') return '🟠';
    return '⚪';
  };

  const getStatusText = () => {
    if (isOverdue) return 'Overdue';
    if (isUpdating) return 'Updating...';
    return metrics.paceStatus === 'on-track' ? 'On Track' : 
           metrics.paceStatus.charAt(0).toUpperCase() + metrics.paceStatus.slice(1);
  };

  const getEncouragementMessage = () => {
    const progress = completedLessons / totalLessons;
    if (progress >= 0.9) return "🎉 Almost there! You're doing great!";
    if (progress >= 0.75) return "💪 Keep up the excellent work!";
    if (progress >= 0.5) return "🚀 You're making solid progress!";
    if (progress >= 0.25) return "📚 Great start! Keep it up!";
    return "🌟 Every lesson gets you closer to success!";
  };

  return (
    <div data-testid="pace-tracker-component" className={`${styles.paceTracker} ${getStatusClass()} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>📊 Pace Tracker</h3>
        <div className={styles.status}>
          <span className={styles.statusIcon}>{getStatusIcon()}</span>
          <span className={styles.statusText}>{getStatusText()}</span>
        </div>
      </div>

      <div className={styles.content}>
        {/* Progress Overview */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {completedLessons.toFixed(1)} / {totalLessons} lessons
            ({((completedLessons / totalLessons) * 100).toFixed(1)}%)
          </div>
        </div>

                 {/* Countdown Timer */}
         {currentDeadline && (
           <div className={styles.deadlineSection}>
             <p className={styles.sectionLabel}>Next Lesson Deadline:</p>
             <CountdownTimer 
               deadline={currentDeadline}
               className={styles.countdown}
             />
           </div>
         )}

        {/* Buffer Status */}
        {bufferHours > 0 && (
          <div className={styles.bufferSection}>
            <p className={styles.sectionLabel}>Time Buffer:</p>
            <div className={styles.bufferDisplay}>
              <span className={styles.bufferAmount}>
                +{bufferHours.toFixed(1)} hours
              </span>
              <span className={styles.bufferDescription}>
                ({(bufferHours / 24).toFixed(1)} days ahead)
              </span>
            </div>
          </div>
        )}

        {/* Pace Metrics */}
        <div className={styles.metricsSection}>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Days until exam:</span>
            <span className={styles.metricValue}>{metrics.daysUntilExam}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Lessons remaining:</span>
            <span className={styles.metricValue}>{metrics.lessonsRemaining}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Target pace:</span>
            <span className={styles.metricValue}>
              {metrics.targetLessonsPerDay.toFixed(2)} lessons/day
            </span>
          </div>
        </div>

        {/* Encouragement */}
        <div className={styles.encouragementSection}>
          <p className={styles.encouragementText}>
            {getEncouragementMessage()}
          </p>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <span className={styles.userText}>
            📝 Tracking progress for {user?.username}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PaceTracker(props: PaceTrackerProps) {
  return (
    <ErrorBoundary fallback={
      <div className={`${styles.paceTracker} ${styles.error} ${props.className || ""}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>📊 Pace Tracker</h3>
          <div className={styles.status}>
            <span className={styles.statusText}>Error</span>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.errorMessage}>
            <p>⚠️ Pace Tracker encountered an error</p>
            <p className={styles.hint}>Please refresh the page to try again</p>
          </div>
        </div>
      </div>
    }>
      <PaceTrackerContent {...props} />
    </ErrorBoundary>
  );
}
