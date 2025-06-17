import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// API Types
interface PaceData {
  userId: number;
  currentDeadline: string | null;
  bufferHours: number;
  lastCompletedLessons: number;
  lastLessonCompletion: string | null;
  examDate: string;
  updatedAt: string;
  metrics?: APIPaceMetrics;
  wasLessonCompleted?: boolean;
}

interface APIPaceMetrics {
  daysUntilExam: number;
  hoursUntilExam: number;
  lessonsRemaining: number;
  totalLessons: number;
  completedLessons: number;
  lessonsPerDay: number;
  hoursPerLesson: number;
  isOnTrack: boolean;
  paceStatus: "ahead" | "on-track" | "behind" | "unknown";
  targetLessonsPerDay: number;
  targetHoursPerDay: number;
  nextDeadline: string;
  bufferHours: number;
  aheadLessons: number;
}

interface UpdatePaceParams {
  completedLessons: number;
  totalLessons: number;
  examDate?: string;
}

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// API Functions
async function fetchPaceData(userId: number, completedLessons?: number, totalLessons?: number): Promise<PaceData> {
  let url = `${API_BASE_URL}/api/v1/pace/${userId}`;
  
  if (completedLessons !== undefined && totalLessons !== undefined) {
    url += `?completedLessons=${completedLessons}&totalLessons=${totalLessons}`;
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch pace data: ${response.statusText}`);
  }

  return response.json();
}

async function updatePaceData(userId: number, params: UpdatePaceParams): Promise<PaceData> {
  const response = await fetch(`${API_BASE_URL}/api/v1/pace/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to update pace data: ${response.statusText}`);
  }

  return response.json();
}

// Hook Types
interface UsePaceTrackerOptions {
  completedLessons: number;
  totalLessons: number;
  examDate?: string;
  enabled?: boolean;
}

interface UsePaceTrackerReturn {
  // Data
  paceData: PaceData | undefined;
  metrics: APIPaceMetrics | undefined;
  
  // State
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Actions
  updatePace: (params: UpdatePaceParams) => Promise<void>;
  isUpdating: boolean;
  updateError: Error | null;
  
  // Computed values
  isDisabled: boolean;
  currentDeadline: Date | null;
  bufferHours: number;
  hoursUntilDeadline: number;
  isOverdue: boolean;
}

// Mock implementation for when React Query is not available
export function usePaceTracker(options: UsePaceTrackerOptions): UsePaceTrackerReturn {
  const { user } = useAuth();
  
  const {
    completedLessons,
    totalLessons,
    examDate,
    enabled = true,
  } = options;

  // State management
  const [paceData, setPaceData] = useState<PaceData | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<Error | null>(null);

  // Disable for anonymous users or when explicitly disabled
  const isDisabled = !user?.id || !enabled;

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (isDisabled) return;
    
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      
      const data = await fetchPaceData(user!.id, completedLessons, totalLessons);
      setPaceData(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      // Check if this is a connection error (backend not running)
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        // Provide a more user-friendly error message
        const friendlyError = new Error('Backend API is not running. Please start the API server or use offline mode.');
        setError(friendlyError);
        console.warn('Backend API unavailable. To start the API server, run: cd apps/api && npm run dev');
      } else {
        setError(error);
        console.error('Failed to fetch pace data:', error);
      }
      
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isDisabled, user?.id, completedLessons, totalLessons]);

  // Update pace function
  const updatePace = useCallback(async (params: UpdatePaceParams) => {
    if (isDisabled) {
      throw new Error('Pace tracking is disabled for anonymous users');
    }
    
    try {
      setIsUpdating(true);
      setUpdateError(null);
      
      const data = await updatePaceData(user!.id, params);
      setPaceData(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setUpdateError(error);
      console.error('Failed to update pace:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [isDisabled, user?.id]);

  // Initial data fetch
  useEffect(() => {
    if (!isDisabled) {
      fetchData();
    }
  }, [fetchData, isDisabled]);

  // Computed values
  const currentDeadline = paceData?.currentDeadline ? new Date(paceData.currentDeadline) : null;
  const bufferHours = paceData?.bufferHours || 0;
  
  const hoursUntilDeadline = currentDeadline 
    ? Math.max(0, (currentDeadline.getTime() - Date.now()) / (1000 * 60 * 60))
    : 0;
    
  const isOverdue = currentDeadline ? Date.now() > currentDeadline.getTime() : false;

  return {
    // Data
    paceData,
    metrics: paceData?.metrics,
    
    // State
    isLoading,
    isError,
    error,
    
    // Actions
    updatePace,
    isUpdating,
    updateError,
    
    // Computed values
    isDisabled,
    currentDeadline,
    bufferHours,
    hoursUntilDeadline,
    isOverdue,
  };
} 