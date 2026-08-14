import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";

const ProtectedRoute = () => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const getInitialSession = async () => {
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession();

            if (error) {
                console.error("Session error:", error.message);
            }

            if (mounted) {
                setSession(session);
                setLoading(false);
            }
        };

        getInitialSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return <div>Checking authentication...</div>;
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;