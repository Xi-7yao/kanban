import { useRef, useCallback, useReducer } from "react";

export function useOperationLock() {
  const pendingOps = useRef<Set<string>>(new Set());
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const acquire = useCallback((key: string): boolean => {
    if (pendingOps.current.has(key)) return false;
    pendingOps.current.add(key);
    forceRender();
    return true;
  }, []);

  const release = useCallback((key: string) => {
    const removed = pendingOps.current.delete(key);
    if (removed) {
      forceRender();
    }
  }, []);

  const isLocked = useCallback((key: string) => pendingOps.current.has(key), []);

  return { acquire, release, isLocked };
}