import { calculatePaceMetrics, formatPaceStatus, formatTimeRemaining, getEncouragementMessage } from '../utils/timeTracking';

interface PaceTrackerProps {
  completedLessons: number;
  totalLessons: number;
  className?: string;
}

export function PaceTracker({ completedLessons, totalLessons, className = '' }: PaceTrackerProps) {
  const metrics = calculatePaceMetrics(completedLessons, totalLessons);
  
  const paceTrackerStyle: React.CSSProperties = {
    background: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
  };
  
  const paceHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  };
  
  const timeRemainingStyle: React.CSSProperties = {
    fontWeight: 600,
    color: '#007bff',
    fontSize: '0.9rem',
  };
  
  const metricRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '0.75rem',
  };
  
  const metricItemStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '0.5rem',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  };
  
  const metricLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    color: '#6c757d',
    marginBottom: '0.25rem',
  };
  
  const metricValueStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    fontSize: '1.1rem',
    color: '#495057',
  };
  
  const paceStatusStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '0.9rem',
    fontWeight: 500,
    padding: '0.5rem',
    marginBottom: '0.5rem',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  };
  
  const encouragementStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#6c757d',
    fontStyle: 'italic',
  };
  
  return (
    <div className={`pace-tracker ${className}`} style={paceTrackerStyle}>
      <div style={paceHeaderStyle}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#495057' }}>📊 Study Pace</h3>
        <div style={timeRemainingStyle}>
          {formatTimeRemaining(metrics)}
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
        
        <div style={paceStatusStyle}>
          {formatPaceStatus(metrics)}
        </div>
        
        <div style={encouragementStyle}>
          {getEncouragementMessage(metrics)}
        </div>
      </div>
    </div>
  );
} 