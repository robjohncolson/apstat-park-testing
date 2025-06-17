import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  deadline: Date;
  className?: string;
  style?: React.CSSProperties;
  updateInterval?: number; // milliseconds, default 5000
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
}

function calculateTimeRemaining(deadline: Date, now: Date): TimeRemaining {
  const msRemaining = deadline.getTime() - now.getTime();
  
  if (msRemaining <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isOverdue: true };
  }

  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, isOverdue: false };
}

function formatCountdown(timeRemaining: TimeRemaining): string {
  if (timeRemaining.isOverdue) {
    return "⏰ Deadline passed!";
  }

  const { hours, minutes, seconds } = timeRemaining;
  
  // Show different formats based on time remaining
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export function CountdownTimer({ 
  deadline, 
  className = "", 
  style = {},
  updateInterval = 5000 
}: CountdownTimerProps) {
  const [now, setNow] = useState(new Date());
  const timeRemaining = calculateTimeRemaining(deadline, now);

  useEffect(() => {
    // Use different update intervals based on time remaining
    let interval = updateInterval;
    
    // Update more frequently when close to deadline
    if (timeRemaining.hours === 0 && timeRemaining.minutes < 5) {
      interval = 1000; // Update every second in final 5 minutes
    } else if (timeRemaining.hours === 0 && timeRemaining.minutes < 30) {
      interval = 5000; // Update every 5 seconds in final 30 minutes
    } else if (timeRemaining.hours < 2) {
      interval = 10000; // Update every 10 seconds in final 2 hours
    }

    const timer = setInterval(() => {
      setNow(new Date());
    }, interval);

    return () => clearInterval(timer);
  }, [updateInterval, timeRemaining.hours, timeRemaining.minutes]);

  return (
    <div className={className} style={style}>
      {formatCountdown(timeRemaining)}
    </div>
  );
} 