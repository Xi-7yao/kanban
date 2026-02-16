import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { authApi } from "../api";

interface AuthContextType {
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(authApi.isLoggedIn());

    useEffect(() => {
        const handleForceLogout = () => {
            setIsAuthenticated(false);
        };
        window.addEventListener("auth:logout", handleForceLogout);
        return () => window.removeEventListener("auth:logout", handleForceLogout);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        await authApi.login(email, password);
        setIsAuthenticated(true);
    }, []);

    const register = useCallback(async (email: string, password: string, name?: string) => {
        await authApi.register(email, password, name);
        setIsAuthenticated(true);
    }, []);

    const logout = useCallback(() => {
        authApi.logout();
        setIsAuthenticated(false);
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
