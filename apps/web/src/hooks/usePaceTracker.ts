import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBlockchain } from '../context/BlockchainProvider';
import { BlockchainService } from '../services/BlockchainService';
import type { PaceUpdateData, PaceState } from '@apstatchain/core';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Generate pace data locally when none is present on chain yet. This re-uses
// the existing offline generator so the UI continues to receive the same
// rich metrics structure it expects.
function generateOfflinePaceData(userId: number, completedLessons: number, totalLessons: number): PaceData {
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
      paceStatus: "on-track" as const,
      targetLessonsPerDay,
      targetHoursPerDay: targetLessonsPerDay * hoursPerLesson,
      nextDeadline: currentDeadline.toISOString(),
      bufferHours: 5.5,
      aheadLessons: 1.2
    }
  };
}

// ---------------------------------------------------------------------------
// Blockchain helpers
// ---------------------------------------------------------------------------

const blockchainService = BlockchainService.getInstance();

function paceStateToPaceData(
  paceState: PaceState,
  userId: number,
): PaceData {
  // For V1 we use the existing offline generator to build the full PaceData
  // structure the UI expects, while filling in values from the blockchain
  // snapshot where possible.
  const generated = generateOfflinePaceData(
    userId,
    paceState.lessonsCompleted,
    paceState.totalLessons,
  );

  return {
    ...generated,
    lastCompletedLessons: paceState.lessonsCompleted,
    metrics: generated.metrics && {
      ...generated.metrics,
      completedLessons: paceState.lessonsCompleted,
      totalLessons: paceState.totalLessons,
    },
  };
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

  // Access blockchain context (reactive app state)
  const { appState } = useBlockchain();

  // Resolve the current public key from the running BlockchainService
  const publicKey = useMemo(() => blockchainService.getPublicKey(), []);

  // Derive the on-chain pace snapshot for the current user (if any)
  const onChainPace = appState.pace[publicKey];

  // State management
  const [paceData, setPaceData] = useState<PaceData | undefined>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<Error | null>(null);

  // Disable for anonymous users or when explicitly disabled
  const isDisabled = !user?.id || !enabled;

  // Keep local paceData in sync with on-chain state or fallback generator
  useEffect(() => {
    if (isDisabled) return;

    if (onChainPace) {
      setPaceData(paceStateToPaceData(onChainPace, user!.id));
    } else {
      // No on-chain data yet – fall back to generated mock
      const offline = generateOfflinePaceData(user!.id, completedLessons, totalLessons);
      setPaceData(offline);
    }
  }, [onChainPace, isDisabled, completedLessons, totalLessons, user?.id]);

  // -----------------------------------------------------------------------
  // Update pace function – writes a PACE_UPDATE transaction
  // -----------------------------------------------------------------------

  const updatePace = useCallback(async (params: UpdatePaceParams) => {
    if (isDisabled) {
      throw new Error('Pace tracking is disabled for anonymous users');
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);

      const txData: PaceUpdateData = {
        totalLessons: params.totalLessons,
        lessonsCompleted: params.completedLessons,
        targetDate: (params.examDate ?? examDate ?? new Date().toISOString().slice(0, 10)),
        updatedAt: Date.now(),
      };

      if (typeof blockchainService.submitPaceUpdate === 'function') {
        await blockchainService.submitPaceUpdate(txData);
      } else {
        await blockchainService.submitTransaction('PACE_UPDATE', txData as any);
      }

      // Optimistically update local state until the block is mined
      setPaceData(paceStateToPaceData({
        lessonsCompleted: params.completedLessons,
        totalLessons: params.totalLessons,
        targetDate: txData.targetDate,
        updatedAt: txData.updatedAt,
      }, user!.id));

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setUpdateError(error);
      console.error('Failed to update pace:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [isDisabled, examDate, user?.id]);

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
    isLoading: false,
    isError: false,
    error: null,
    
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