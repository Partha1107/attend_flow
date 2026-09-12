import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { ALLOWED_USERS } from "../constants/allowedUsers";

const ProtectedRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  // ============================================================
  // AUTH SESSION
  // ============================================================

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session check error:", error);
        }

        if (mounted) {
          setSession(currentSession);
          setLoading(false);
        }
      } catch (error) {
        console.error("Authentication error:", error);

        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;

        setSession(nextSession);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // LOADING AUTHENTICATION
  // ============================================================

  if (loading) {
    return (
      <div>
        Checking authentication...
      </div>
    );
  }

  // ============================================================
  // SUPABASE NOT CONFIGURED
  // ============================================================

  if (!supabase) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // ============================================================
  // NOT LOGGED IN
  // ============================================================

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // ============================================================
  // CHECK KALVIUM EMAIL DOMAIN
  // ============================================================

  const email = session.user?.email?.toLowerCase();

  const isKalviumUser =
    email && email.endsWith("@kalvium.com") ;

  const isDeveloper =
    ALLOWED_USERS.includes(email);

  if (!isKalviumUser && !isDeveloper) {
    return (
      <Navigate
        to="/access-denied"
        replace
      />
    );
  }

  // ============================================================
  // AUTHENTICATED USER
  // ============================================================

  return <Outlet />;
};

export default ProtectedRoute;