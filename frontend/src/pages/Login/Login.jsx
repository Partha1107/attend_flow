import { motion } from "framer-motion";
import { FaGoogle } from "react-icons/fa";
import { useState } from "react";
import {
    supabase,
    supabaseConfigError,
} from "../../lib/supabase";
import "./Login.css";

const Login = () => {
    const hasSupabase = Boolean(supabase);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleLogin = async () => {
        if (!supabase) {
            setError(supabaseConfigError);
            return;
        }

        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
            },
        });

        if (error) {
            console.error("Google login error:", error.message);
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <motion.div
                className="login-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Logo */}
                <div className="login-brand">
                    <div className="login-logo">A</div>

                    <h1>AESA</h1>

                    <p>Mentor Access Portal</p>
                </div>

                {/* Login Card */}
                <div className="login-card">
                    <div className="login-heading">
                        <h2>Welcome Back</h2>

                        <p>
                            Sign in to manage student attendance
                        </p>
                    </div>

                    {/* Google Login */}
                    <button
                        type="button"
                        className="google-login-button"
                        onClick={handleGoogleLogin}
                        disabled={!hasSupabase || loading}
                    >
                        <FaGoogle className="google-icon" />

                        <span>
                            {loading
                                ? "Redirecting..."
                                : "Continue with Google"}
                        </span>
                    </button>

                    {error && (
                        <p className="login-error">{error}</p>
                    )}

                    {!hasSupabase && (
                        <p className="login-info">
                            Supabase is not configured. Add environment variables in
                            frontend/.env and restart the dev server.
                        </p>
                    )}

                    {/* Divider */}
                    <div className="login-divider">
                        <span></span>
                        <p>Authorized access only</p>
                        <span></span>
                    </div>

                    <p className="login-info">
                        This portal is restricted to authorized mentors.
                    </p>
                </div>

                {/* Footer */}
                <p className="login-footer">
                    AESA • Attendance Email & SMS Automation
                </p>
            </motion.div>
        </div>
    );
};

export default Login;