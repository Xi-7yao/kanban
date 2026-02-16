import { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

function AuthPage() {
    const { login, register } = useAuth();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password.trim()) {
            setError("Please enter both email and password.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            if (isLoginMode) {
                await login(email, password);
            } else {
                await register(email, password, name || undefined);
            }
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Something went wrong.";
            setError(Array.isArray(message) ? message.join(", ") : message);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setError("");
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 border-2 border-rose-500 mb-4">
                        {isLoginMode
                            ? <LogIn size={28} className="text-rose-500" />
                            : <UserPlus size={28} className="text-rose-500" />
                        }
                    </div>
                    <h1 className="text-3xl font-bold text-white">
                        {isLoginMode ? "Welcome Back" : "Create Account"}
                    </h1>
                    <p className="text-gray-400 mt-2">
                        {isLoginMode
                            ? "Sign in to your kanban board"
                            : "Sign up to get started"
                        }
                    </p>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-700 p-6 shadow-2xl">
                    {/* Error Display */}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Name field (register only) */}
                    {!isLoginMode && (
                        <div className="mb-4">
                            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                                Name
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    placeholder="Your name (optional)"
                                />
                            </div>
                        </div>
                    )}

                    {/* Email field */}
                    <div className="mb-4">
                        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                            Email
                        </label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password field */}
                    <div className="mb-6">
                        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                            Password
                        </label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-3 rounded-lg bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                placeholder="At least 6 characters"
                                autoComplete={isLoginMode ? "current-password" : "new-password"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition font-medium shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : isLoginMode ? (
                            <LogIn size={20} />
                        ) : (
                            <UserPlus size={20} />
                        )}
                        {loading ? "Please wait..." : isLoginMode ? "Sign In" : "Sign Up"}
                    </button>

                    {/* Toggle login/register */}
                    <p className="text-center text-gray-400 mt-4 text-sm">
                        {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-rose-500 hover:text-rose-400 font-medium transition"
                        >
                            {isLoginMode ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default AuthPage;
