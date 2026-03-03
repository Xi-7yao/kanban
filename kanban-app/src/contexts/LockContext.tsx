import { createContext, useContext, type ReactNode } from "react";
import { useOperationLock } from "../hooks/useOperationLock";

type LockContextType = ReturnType<typeof useOperationLock>;

const LockContext = createContext<LockContextType | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
    const lock = useOperationLock();
    return (
        <LockContext.Provider value={lock}>
            {children}
        </LockContext.Provider>
    );
}

export function useLock() {
    const context = useContext(LockContext);
    if (!context) {
        throw new Error("useLock must be used within a LockProvider");
    }
    return context;
}