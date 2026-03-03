import { useRef, useCallback } from "react";

export function useOperationLock() {
    const pendingOps = useRef<Set<string>>(new Set());

    const acquire = useCallback((key: string): boolean => {
        if (pendingOps.current.has(key)) return false; // 已锁定
        pendingOps.current.add(key);
        return true;
    }, []);

    const release = useCallback((key: string) => {
        pendingOps.current.delete(key);
    }, []);

    const isLocked = useCallback((key: string) =>
        pendingOps.current.has(key), []);

    return { acquire, release, isLocked };
}