import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ALLOWED_USERS } from "../constants/allowedUsers";

const ProtectedRoute = () => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            setSession(session);
            setLoading(false);
        };

        checkSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return <div>Checking authentication...</div>;
    }

    // Not logged in
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Check mentor email domain
    const email = session.user?.email?.toLowerCase();

    if (!email || !ALLOWED_USERS.includes(email)) {
        return <Navigate to="/access-denied" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;