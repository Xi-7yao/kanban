import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { LockProvider } from "./contexts/LockContext";
import { SocketProvider } from "./contexts/SocketContext";
import KanbanBoard from "./components/KanbanBoard";
import AuthPage from "./components/AuthPage";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

function AppContent() {
    const { isAuthenticated } = useAuth();
    return (
        <div className="bg-black min-h-screen text-white">
            {isAuthenticated ? (
                <LockProvider>
                    <SocketProvider enabled={isAuthenticated}>
                        <KanbanBoard />
                    </SocketProvider>
                </LockProvider>
            ) : (
                <AuthPage />
            )}
        </div>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <ToastProvider>
                    <AppContent />
                </ToastProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
