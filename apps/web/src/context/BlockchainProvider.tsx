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
import type { QuizQuestion, AppState } from "@apstatchain/core";

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

  // Projected blockchain state
  appState: AppState;

  // Service API methods
  initialize: () => Promise<void>;
  /** Backwards compat alias – will call initialize() internally */
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
  const [, forceRender] = useState({}); // dummy state to force refresh when appState updates

  // Subscribe to service updates ONCE.
  useEffect(() => {
    const unsubscribe = serviceRef.current.subscribe(setServiceState);

    // Kick-off the service. Errors are logged but not thrown so UI remains usable.
    serviceRef.current
      .initialize()
      .catch((err) => console.error("Failed to start BlockchainService", err));

    // Listen once appState changes (rudimentary – mutate detection)
    const interval = setInterval(() => {
      // Trigger re-render when appState reference changes
      forceRender({});
    }, 1000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    }; // Cleanup subscription on unmount.
  }, []);

  const contextValue: BlockchainContextType = {
    ...serviceState,
    appState: serviceRef.current.state,
    initialize: () => serviceRef.current.initialize(),
    start: () => serviceRef.current.initialize(),
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