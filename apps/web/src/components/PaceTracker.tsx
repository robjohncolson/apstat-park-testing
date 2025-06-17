import {
  calculatePaceMetrics,
  formatPaceStatus,
  getEncouragementMessage,
  formatDeadlineCountdown,
  formatBufferStatus,
  formatTargetPace,
} from "../utils/timeTracking";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

interface PaceTrackerProps {
  completedLessons: number;
  totalLessons: number;
  className?: string;
}

export function PaceTracker({
  completedLessons,
  totalLessons,
  className = "",
}: PaceTrackerProps) {
  const { user } = useAuth();
  
  // Keys for localStorage - use stable keys that don't change between login sessions
  // Since user IDs are randomly generated in offline mode, we use global keys
  const deadlineKey = 'apstat_pace_deadline';
  const bufferKey = 'apstat_pace_buffer';

  // Synchronously load initial values from localStorage to avoid race conditions
  const loadInitialValues = () => {
    let initialDeadline: Date | undefined = undefined;
    let initialBuffer = 0;
    
    try {
      // Load persisted deadline
      const savedDeadline = localStorage.getItem(deadlineKey);
      if (savedDeadline) {
        const deadline = new Date(savedDeadline);
        if (!isNaN(deadline.getTime())) {
          initialDeadline = deadline;
        }
      }

      // Load persisted buffer
      const savedBuffer = localStorage.getItem(bufferKey);
      if (savedBuffer) {
        const buffer = parseFloat(savedBuffer);
        if (!isNaN(buffer)) {
          initialBuffer = buffer;
        }
      }
    } catch (error) {
      console.warn('Failed to load pace tracker data from localStorage:', error);
    }
    
    return { initialDeadline, initialBuffer };
  };

  const { initialDeadline, initialBuffer } = loadInitialValues();

  // Phase 2: State for real-time countdown updates
  const [now, setNow] = useState(new Date());
  // Phase 2: State for fixed deadline (doesn't move with time) - initialized from localStorage
  const [fixedDeadline, setFixedDeadline] = useState<Date | undefined>(initialDeadline);
  // State for the buffer, which will now accumulate and persist - initialized from localStorage
  const [bufferHours, setBufferHours] = useState(initialBuffer);

  // Ref to track the previous number of completed lessons
  const prevCompletedLessonsRef = useRef(completedLessons);

  // Persist deadline when it changes
  useEffect(() => {
    if (fixedDeadline) {
      try {
        localStorage.setItem(deadlineKey, fixedDeadline.toISOString());
      } catch (error) {
        console.warn('Failed to save deadline to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem(deadlineKey);
      } catch (error) {
        console.warn('Failed to remove deadline from localStorage:', error);
      }
    }
  }, [fixedDeadline, deadlineKey]);

  // Persist buffer when it changes
  useEffect(() => {
    try {
      localStorage.setItem(bufferKey, bufferHours.toString());
    } catch (error) {
      console.warn('Failed to save buffer to localStorage:', error);
    }
  }, [bufferHours, bufferKey]);

  // Update every second for countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Recalculate and ACCUMULATE buffer when a WHOLE lesson is completed
  useEffect(() => {
    const prevFloored = Math.floor(prevCompletedLessonsRef.current);
    const currentFloored = Math.floor(completedLessons);

    // Only trigger if we've crossed a whole number threshold
    if (currentFloored > prevFloored && fixedDeadline) {
      // Get the current time when the effect actually runs to avoid stale closures
      const currentTime = new Date();
      
      // Calculate how much time was saved for the lesson that was just completed
      const timeSavedInHours =
        (fixedDeadline.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

      // The number of whole lessons just completed (usually 1)
      const lessonsFinished = currentFloored - prevFloored;

      // Add the saved time to our buffer and cap it at 336 hours (14 days)
      setBufferHours((prevBuffer) => {
        const newBuffer = prevBuffer + timeSavedInHours * lessonsFinished;
        return Math.min(newBuffer, 336);
      });

      // Reset the deadline so a new one is calculated
      setFixedDeadline(undefined);
    }

    // Always update the ref to the latest value for the next check
    prevCompletedLessonsRef.current = completedLessons;
  }, [completedLessons, fixedDeadline]);

  // Pass the STATEFUL buffer to the calculation function
  const metrics = calculatePaceMetrics(
    completedLessons,
    totalLessons,
    undefined,
    now,
    bufferHours,
    fixedDeadline,
  );

  // Set a new fixed deadline ONLY if one doesn't exist (not if it has passed)
  useEffect(() => {
    if (!fixedDeadline) {
      setFixedDeadline(metrics.nextDeadline);
    }
  }, [fixedDeadline, metrics.nextDeadline]);

  const paceTrackerStyle: React.CSSProperties = {
    background: "var(--color-surface)",
    border: "2px solid var(--color-border)",
    borderRadius: "12px",
    padding: "1rem",
    marginBottom: "1rem",
  };

  const metricRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "0.75rem",
  };

  const metricItemStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "0.5rem",
    background: "var(--color-surface)",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
  };

  const metricLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
    marginBottom: "0.25rem",
  };

  const metricValueStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 600,
    fontSize: "1.1rem",
    color: "var(--color-text-base)",
  };

  const paceStatusStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: "0.9rem",
    fontWeight: 500,
    padding: "0.5rem",
    marginBottom: "0.5rem",
    background: "var(--color-surface)",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
  };

  const encouragementStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: "0.85rem",
    color: "var(--color-text-muted)",
    fontStyle: "italic",
  };

  return (
    <div
      className={`pace-tracker p-6 rounded-lg border-2 border-gray-200 shadow-lg ${className}`}
      style={paceTrackerStyle}
    >
      {/* Phase 2: Primary - Soft Deadline Countdown */}
      <div className="deadline-section mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          📅 Next Lesson Deadline
        </h3>
        <div className="text-2xl font-mono text-green-900 mb-2">
          {formatDeadlineCountdown(metrics.nextDeadline, now)}
        </div>
        <div className="text-sm text-green-700">
          Complete next lesson by: {metrics.nextDeadline.toLocaleString()}
        </div>
      </div>

      {/* Phase 2: Secondary - Buffer Status */}
      <div className="buffer-section mb-4">
        <div className="text-lg font-medium mb-1">
          {formatBufferStatus(metrics)}
        </div>
        <div className="text-sm text-gray-600">
          {formatTargetPace(metrics.targetLessonsPerDay)}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-center">
        📊 Study Pace Tracker
      </h2>

      {/* Progress Summary */}
      <div className="progress-summary mb-6">
        <div className="text-lg">
          <strong>{metrics.completedLessons.toFixed(2)}</strong> of{" "}
          <strong>{metrics.totalLessons}</strong> lessons completed
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {metrics.lessonsRemaining.toFixed(2)} lessons remaining
        </div>
      </div>

      <div className="pace-metrics">
        <div style={metricRowStyle}>
          <div style={metricItemStyle}>
            <span style={metricLabelStyle}>Lessons Remaining</span>
            <span style={metricValueStyle}>{metrics.lessonsRemaining}</span>
          </div>

          <div style={metricItemStyle}>
            <span style={metricLabelStyle}>Target Pace</span>
            <span style={metricValueStyle}>
              {metrics.targetLessonsPerDay.toFixed(1)} per day
            </span>
          </div>
        </div>

        <div style={paceStatusStyle}>{formatPaceStatus(metrics)}</div>

        <div style={encouragementStyle}>
          {getEncouragementMessage(
            metrics.completedLessons / metrics.totalLessons,
          )}
        </div>
      </div>
    </div>
  );
}
