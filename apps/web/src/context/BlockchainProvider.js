import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useRef, useState, } from "react";
import { BlockchainService, } from "../services/BlockchainService";
const BlockchainContext = createContext(undefined);
export function BlockchainProvider({ children }) {
    // Hold singleton instance in a ref so identity is stable across renders.
    const serviceRef = useRef(BlockchainService.getInstance());
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
    const contextValue = {
        ...serviceState,
        start: () => serviceRef.current.start(),
        submitLessonProgress: (payload) => serviceRef.current.submitLessonProgress(payload),
        submitPuzzleSolution: (solution) => serviceRef.current.submitPuzzleSolution(solution),
    };
    return (_jsx(BlockchainContext.Provider, { value: contextValue, children: children }));
}
export function useBlockchain() {
    const ctx = useContext(BlockchainContext);
    if (ctx === undefined) {
        throw new Error("useBlockchain must be used within a BlockchainProvider");
    }
    return ctx;
}
