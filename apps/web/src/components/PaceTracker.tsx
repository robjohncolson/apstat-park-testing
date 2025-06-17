import { usePaceTracker } from "../hooks/usePaceTracker";
import { CountdownTimer } from "./ui/CountdownTimer";

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
  const { metrics, formattedData, isLoading, error } = usePaceTracker({
    completedLessons,
    totalLessons,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className={`pace-tracker ${className}`} style={paceTrackerStyle}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>📊 Loading pace tracker...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`pace-tracker ${className}`} style={paceTrackerStyle}>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-danger)' }}>
          <p>⚠️ {error}</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Please refresh the page to try again
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pace-tracker p-6 rounded-lg border-2 border-gray-200 shadow-lg ${className}`}
      style={paceTrackerStyle}
    >
      {/* Primary - Soft Deadline Countdown */}
      <div className="deadline-section mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          📅 Next Lesson Deadline
        </h3>
        <CountdownTimer
          deadline={metrics.nextDeadline}
          className="text-2xl font-mono text-green-900 mb-2"
        />
        <div className="text-sm text-green-700">
          Complete next lesson by: {metrics.nextDeadline.toLocaleString()}
        </div>
      </div>

      {/* Secondary - Buffer Status */}
      <div className="buffer-section mb-4">
        <div className="text-lg font-medium mb-1">
          {formattedData.bufferStatus}
        </div>
        <div className="text-sm text-gray-600">
          {formattedData.targetPace}
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

      {/* Metrics Grid */}
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

      <div style={paceStatusStyle}>{formattedData.paceStatus}</div>

      <div style={encouragementStyle}>
        {formattedData.encouragementMessage}
      </div>
    </div>
  );
}

// Styles extracted for reusability
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
