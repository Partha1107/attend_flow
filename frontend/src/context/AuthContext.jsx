import {
    useEffect,
    useState,
} from "react";

import { supabase } from "../lib/supabase";
import { getMentorProfile } from "../api/mentor";
import { AuthContext } from "./authContextValue";

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            return;
        }

        let mounted = true;

        const initialize = async () => {
            try {
                const {
                    data: { session: currentSession },
                    error,
                } = await supabase.auth.getSession();
                const result = await getMentorProfile();

                console.log("========== AUTH DEBUG ==========");
                console.log("SESSION USER ID:", currentSession.user?.id);
                console.log("PROFILE RESULT:", result);
                console.log("PROFILE:", result?.profile);   
                console.log("JOB ROLE:", result?.profile?.job_role);
                console.log("================================");

                if (!mounted) return;

                setProfile(result?.profile || null);
                if (error) {
                    console.error(
                        "Session error:",
                        error
                    );
                }

                if (!mounted) return;

                setSession(currentSession);

                if (currentSession) {
                    try {
                        const result =
                            await getMentorProfile();

                        if (!mounted) return;

                        console.log(
                            "AUTH PROFILE:",
                            result?.profile
                        );

                        setProfile(
                            result?.profile || null
                        );
                    } catch (profileError) {
                        console.error(
                            "Profile loading error:",
                            profileError
                        );

                        if (mounted) {
                            setProfile(null);
                        }
                    }
                } else {
                    setProfile(null);
                }

                if (mounted) {
                    setLoading(false);
                }
            } catch (error) {
                console.error(
                    "Authentication initialization error:",
                    error
                );

                if (mounted) {
                    setSession(null);
                    setProfile(null);
                    setLoading(false);
                }
            }
        };

        void initialize();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, nextSession) => {
                if (!mounted) return;

                setSession(nextSession);

                if (!nextSession) {
                    setProfile(null);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const refreshProfile = async () => {
        try {
            const result =
                await getMentorProfile();

            setProfile(result?.profile || null);

            return result;
        } catch (error) {
            console.error(
                "Failed to refresh profile:",
                error
            );

            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                profile,
                loading,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};