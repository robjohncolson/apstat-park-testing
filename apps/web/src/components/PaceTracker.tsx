import {
  calculatePaceMetrics,
  formatPaceStatus,
  formatTimeRemaining,
  getEncouragementMessage,
  formatDeadlineCountdown,
  formatBufferStatus,
  formatTargetPace,
} from "../utils/timeTracking";
import { useState, useEffect, useRef } from "react";

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
  // Phase 2: State for real-time countdown updates
  const [now, setNow] = useState(new Date());
  // Phase 2: State for fixed deadline (doesn't move with time)
  const [fixedDeadline, setFixedDeadline] = useState<Date | undefined>(
    undefined,
  );
  // --- START OF FIX ---
  // State for the buffer, which will now accumulate
  const [bufferHours, setBufferHours] = useState(0); // TODO Phase 6: Load from persistence

  // Ref to track the previous number of completed lessons
  const prevCompletedLessonsRef = useRef(completedLessons);

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
      // Calculate how much time was saved for the lesson that was just completed
      const timeSavedInHours =
        (fixedDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);

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
  }, [completedLessons, fixedDeadline, now]);

  // Pass the STATEFUL buffer to the calculation function
  const metrics = calculatePaceMetrics(
    completedLessons,
    totalLessons,
    undefined,
    now,
    bufferHours,
    fixedDeadline,
  );

  // Set a new fixed deadline if one doesn't exist or has passed
  useEffect(() => {
    if (!fixedDeadline || fixedDeadline <= now) {
      setFixedDeadline(metrics.nextDeadline);
    }
  }, [fixedDeadline, now, metrics.nextDeadline]);
  // --- END OF FIX ---

  const paceTrackerStyle: React.CSSProperties = {
    background: "#f8f9fa",
    border: "2px solid #e9ecef",
    borderRadius: "12px",
    padding: "1rem",
    marginBottom: "1rem",
  };

  const paceHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
  };

  const timeRemainingStyle: React.CSSProperties = {
    fontWeight: 600,
    color: "#007bff",
    fontSize: "0.9rem",
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
    background: "white",
    borderRadius: "8px",
    border: "1px solid #dee2e6",
  };

  const metricLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    color: "#6c757d",
    marginBottom: "0.25rem",
  };

  const metricValueStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 600,
    fontSize: "1.1rem",
    color: "#495057",
  };

  const paceStatusStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: "0.9rem",
    fontWeight: 500,
    padding: "0.5rem",
    marginBottom: "0.5rem",
    background: "white",
    borderRadius: "8px",
    border: "1px solid #dee2e6",
  };

  const encouragementStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: "0.85rem",
    color: "#6c757d",
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
