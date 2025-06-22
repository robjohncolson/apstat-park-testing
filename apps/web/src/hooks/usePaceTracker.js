import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
// API Base URL - prioritize VITE_API_URL, then VITE_API_BASE_URL, then localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
// Generate offline pace data when API is unavailable
function generateOfflinePaceData(userId, completedLessons, totalLessons) {
    // Calculate mock exam date (next May 13th)
    const currentYear = new Date().getFullYear();
    const mayExamDate = new Date(currentYear, 4, 13, 8, 0, 0);
    const examDate = new Date() > mayExamDate
        ? new Date(currentYear + 1, 4, 13, 8, 0, 0)
        : mayExamDate;
    // Mock deadline (24 hours from now)
    const currentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Mock metrics calculation
    const lessonsRemaining = Math.max(0, totalLessons - completedLessons);
    const daysUntilExam = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const hoursUntilExam = (examDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const targetLessonsPerDay = lessonsRemaining / Math.max(1, daysUntilExam);
    const hoursPerLesson = hoursUntilExam / Math.max(1, lessonsRemaining);
    return {
        userId,
        currentDeadline: currentDeadline.toISOString(),
        bufferHours: 5.5,
        lastCompletedLessons: Math.max(0, completedLessons - 0.1), // Show as slightly behind to allow updates
        lastLessonCompletion: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        examDate: examDate.toISOString(),
        updatedAt: new Date().toISOString(),
        wasLessonCompleted: false,
        metrics: {
            daysUntilExam,
            hoursUntilExam,
            lessonsRemaining,
            totalLessons,
            completedLessons,
            lessonsPerDay: completedLessons > 0 ? completedLessons / 30 : 0, // Assume 30 days elapsed
            hoursPerLesson,
            isOnTrack: true,
            paceStatus: "on-track",
            targetLessonsPerDay,
            targetHoursPerDay: targetLessonsPerDay * hoursPerLesson,
            nextDeadline: currentDeadline.toISOString(),
            bufferHours: 5.5,
            aheadLessons: 1.2
        }
    };
}
// API Functions
async function fetchPaceData(userId, completedLessons, totalLessons) {
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
async function updatePaceData(userId, params) {
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
// Mock implementation for when React Query is not available
export function usePaceTracker(options) {
    const { user } = useAuth();
    const { completedLessons, totalLessons, 
    // examDate, // Currently unused in the hook implementation
    enabled = true, } = options;
    // State management
    const [paceData, setPaceData] = useState();
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState(null);
    // Disable for anonymous users or when explicitly disabled
    const isDisabled = !user?.id || !enabled;
    // Fetch data function
    const fetchData = useCallback(async () => {
        if (isDisabled)
            return;
        try {
            setIsLoading(true);
            setIsError(false);
            setError(null);
            const data = await fetchPaceData(user.id, completedLessons, totalLessons);
            setPaceData(data);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            // Check if this is a connection error - use offline fallback instead of error
            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                console.warn('Pace tracker API unavailable - using offline mode with mock data');
                // Generate offline pace data
                const offlinePaceData = generateOfflinePaceData(user.id, completedLessons, totalLessons);
                setPaceData(offlinePaceData);
                setIsError(false);
                setError(null);
            }
            else {
                setError(error);
                console.error('Failed to fetch pace data:', error);
                setIsError(true);
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [isDisabled, user?.id, completedLessons, totalLessons]);
    // Update pace function
    const updatePace = useCallback(async (params) => {
        if (isDisabled) {
            throw new Error('Pace tracking is disabled for anonymous users');
        }
        try {
            setIsUpdating(true);
            setUpdateError(null);
            const data = await updatePaceData(user.id, params);
            setPaceData(data);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setUpdateError(error);
            console.error('Failed to update pace:', error);
            throw error;
        }
        finally {
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
    // const examDate = paceData?.examDate; // Unused variable - commented out
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
