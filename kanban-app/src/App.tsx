import { AuthProvider, useAuth } from "./contexts/AuthContext";
import KanbanBoard from "./components/KanbanBoard";
import AuthPage from "./components/AuthPage";

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-black min-h-screen text-white">
      {isAuthenticated ? <KanbanBoard /> : <AuthPage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;