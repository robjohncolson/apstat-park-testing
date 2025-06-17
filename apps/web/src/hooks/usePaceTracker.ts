import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  calculatePaceMetrics,
  formatPaceStatus,
  getEncouragementMessage,
  formatDeadlineCountdown,
  formatBufferStatus,
  formatTargetPace,
  type PaceMetrics,
} from "../utils/timeTracking";

interface UsePaceTrackerProps {
  completedLessons: number;
  totalLessons: number;
}

interface PaceTrackerData {
  metrics: PaceMetrics;
  formattedData: {
    paceStatus: string;
    encouragementMessage: string;
    deadlineCountdown: string;
    bufferStatus: string;
    targetPace: string;
  };
  isLoading: boolean;
  error?: string;
}

export function usePaceTracker({ completedLessons, totalLessons }: UsePaceTrackerProps): PaceTrackerData {
  const { user } = useAuth();
  
  // User-specific localStorage keys
  const userId = user?.id || 'anonymous';
  const deadlineKey = `apstat_pace_deadline_${userId}`;
  const bufferKey = `apstat_pace_buffer_${userId}`;

  // State
  const [now, setNow] = useState(new Date());
  const [fixedDeadline, setFixedDeadline] = useState<Date | undefined>();
  const [bufferHours, setBufferHours] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  // Ref to track previous completed lessons
  const prevCompletedLessonsRef = useRef(completedLessons);

  // Load initial values from localStorage
  useEffect(() => {
    try {
      const savedDeadline = localStorage.getItem(deadlineKey);
      if (savedDeadline) {
        const deadline = new Date(savedDeadline);
        if (!isNaN(deadline.getTime())) {
          setFixedDeadline(deadline);
        }
      }

      const savedBuffer = localStorage.getItem(bufferKey);
      if (savedBuffer) {
        const buffer = parseFloat(savedBuffer);
        if (!isNaN(buffer)) {
          setBufferHours(buffer);
        }
      }
    } catch (err) {
      console.warn('Failed to load pace tracker data from localStorage:', err);
      setError('Failed to load saved progress data');
    } finally {
      setIsLoading(false);
    }
  }, [deadlineKey, bufferKey]);

  // Persist deadline when it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        if (fixedDeadline) {
          localStorage.setItem(deadlineKey, fixedDeadline.toISOString());
        } else {
          localStorage.removeItem(deadlineKey);
        }
      } catch (err) {
        console.warn('Failed to save deadline to localStorage:', err);
        setError('Failed to save progress data');
      }
    }
  }, [fixedDeadline, deadlineKey, isLoading]);

  // Persist buffer when it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(bufferKey, bufferHours.toString());
      } catch (err) {
        console.warn('Failed to save buffer to localStorage:', err);
        setError('Failed to save progress data');
      }
    }
  }, [bufferHours, bufferKey, isLoading]);

  // Update timer (reduced frequency for better performance)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Handle lesson completion and buffer accumulation
  useEffect(() => {
    const prevFloored = Math.floor(prevCompletedLessonsRef.current);
    const currentFloored = Math.floor(completedLessons);

    // Only trigger if we've crossed a whole number threshold
    if (currentFloored > prevFloored && fixedDeadline) {
      const currentTime = new Date();
      
      // Calculate time saved for the lesson that was just completed
      const timeSavedInHours = (fixedDeadline.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      const lessonsFinished = currentFloored - prevFloored;

      // Add the saved time to buffer and cap it at 336 hours (14 days)
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

  // Calculate metrics
  const metrics = calculatePaceMetrics(
    completedLessons,
    totalLessons,
    undefined,
    now,
    bufferHours,
    fixedDeadline,
  );

  // Set a new fixed deadline only if one doesn't exist
  useEffect(() => {
    if (!fixedDeadline && !isLoading) {
      setFixedDeadline(metrics.nextDeadline);
    }
  }, [fixedDeadline, metrics.nextDeadline, isLoading]);

  // Format data for display
  const formattedData = {
    paceStatus: formatPaceStatus(metrics),
    encouragementMessage: getEncouragementMessage(metrics.completedLessons / metrics.totalLessons),
    deadlineCountdown: formatDeadlineCountdown(metrics.nextDeadline, now),
    bufferStatus: formatBufferStatus(metrics),
    targetPace: formatTargetPace(metrics.targetLessonsPerDay),
  };

  return {
    metrics,
    formattedData,
    isLoading,
    error,
  };
} 