/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useSocket } from "../hooks/useSocket";
import type { Socket } from "socket.io-client";

interface SocketContextType {
  socketRef: React.RefObject<Socket | null>;
  emitLockAcquire: (cardId: string | number) => void;
  emitLockRelease: (cardId: string | number) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useSocket();

  const emitLockAcquire = useCallback(
    (cardId: string | number) => {
      socketRef.current?.emit("lock:acquire", cardId);
    },
    [socketRef],
  );

  const emitLockRelease = useCallback(
    (cardId: string | number) => {
      socketRef.current?.emit("lock:release", cardId);
    },
    [socketRef],
  );

  return (
    <SocketContext.Provider value={{ socketRef, emitLockAcquire, emitLockRelease }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}
