import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  BlockchainService,
  type LessonProgressPayload,
  type SyncStatus,
} from "../services/BlockchainService";
import type { LeaderboardEntry } from "../utils/leaderboard";
import type { QuizQuestion } from "@apstatchain/core";

// -----------------------------------------------------------------------------
// Blockchain Context Types
// -----------------------------------------------------------------------------

interface BlockchainContextType {
  // Reactive state exposed to UI
  syncStatus: SyncStatus;
  peerCount: number;
  leaderboardData: LeaderboardEntry[];
  isProposalRequired: boolean;
  /** The currently assigned mining puzzle, or null if none */
  puzzleData: QuizQuestion | null;

  // Service API methods
  start: () => Promise<void>;
  submitLessonProgress: (payload: LessonProgressPayload) => Promise<void>;
  /** Submit the selected answer index for the current mining puzzle */
  submitPuzzleSolution: (solutionIndex: number) => Promise<void>;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

interface BlockchainProviderProps {
  children: ReactNode;
}

export function BlockchainProvider({ children }: BlockchainProviderProps) {
  // Hold singleton instance in a ref so identity is stable across renders.
  const serviceRef = useRef<BlockchainService>(BlockchainService.getInstance());

  // Local state mirrors the internal service state via the subscribe helper.
  const [serviceState, setServiceState] = useState(() => serviceRef.current.getState());

  // Subscribe to service updates ONCE.
  useEffect(() => {
    const unsubscribe = serviceRef.current.subscribe(setServiceState);

    // Kick-off the service. Errors are logged but not thrown so UI remains usable.
    serviceRef.current
      .start()
      .catch((err) => console.error("Failed to start BlockchainService", err));

    return unsubscribe; // Cleanup subscription on unmount.
  }, []);

  const contextValue: BlockchainContextType = {
    ...serviceState,
    start: () => serviceRef.current.start(),
    submitLessonProgress: (payload) => serviceRef.current.submitLessonProgress(payload),
    submitPuzzleSolution: (solution) => serviceRef.current.submitPuzzleSolution(solution),
  };

  return (
    <BlockchainContext.Provider value={contextValue}>{children}</BlockchainContext.Provider>
  );
}

export function useBlockchain(): BlockchainContextType {
  const ctx = useContext(BlockchainContext);
  if (ctx === undefined) {
    throw new Error("useBlockchain must be used within a BlockchainProvider");
  }
  return ctx;
} 