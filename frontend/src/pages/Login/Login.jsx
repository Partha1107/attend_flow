import { motion } from "framer-motion";
import { FaGoogle } from "react-icons/fa";
import {
    supabase,
    supabaseConfigError,
} from "../../lib/supabase";
import "./Login.css";

const Login = () => {
    const hasSupabase = Boolean(supabase);

    const handleGoogleLogin = async () => {
        if (!supabase) {
            console.error(supabaseConfigError);
            return;
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin,
            },
        });

        if (error) {
            console.error("Google login error:", error.message);
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
                        disabled={!hasSupabase}
                    >
                        <FaGoogle className="google-icon" />

                        <span>Continue with Google</span>
                    </button>

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