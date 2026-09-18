import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { ALLOWED_USERS } from "../constants/allowedUsers";
import { getMentorProfile } from "../api/mentor";
import Loader from "../components/Loader";
const ProtectedRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  const [accessChecking, setAccessChecking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [accessError, setAccessError] = useState(false);

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
  // CHECK ACCOUNT BLOCK STATUS
  // Applies to:
  // - Mentor
  // - Campus Manager
  // ============================================================

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    let mounted = true;

    const checkUserAccess = async () => {
      setAccessChecking(true);
      setAccessError(false);
      setIsBlocked(false);

      try {
        const result = await getMentorProfile();

        console.log(
          "🔥 USER PROFILE RESPONSE:",
          result
        );

        if (!mounted) return;

        // No profile = cannot verify access
        if (!result?.profile) {
          console.error(
            "❌ User profile not found."
          );

          setAccessError(true);
          return;
        }

        const blocked =
          result.profile.is_blocked === true;

        console.log(
          "🔥 USER IS BLOCKED:",
          blocked
        );

        setIsBlocked(blocked);
      } catch (error) {
        console.error(
          "❌ User access check error:",
          error
        );

        if (mounted) {
          // Fail closed.
          // If the account status cannot be verified,
          // do not grant access.
          setAccessError(true);
        }
      } finally {
        if (mounted) {
          setAccessChecking(false);
        }
      }
    };

    void checkUserAccess();

    return () => {
      mounted = false;
    };
  }, [session]);

  // ============================================================
  // LOADING AUTHENTICATION
  // ============================================================

  if (loading) {
    return (
      <Loader
        fullScreen={true}
        size="large"
        text="Loading..."
      />
    );
  }

  // ============================================================
  // SUPABASE NOT CONFIGURED
  // ============================================================

  if (!supabase) {
    return <Navigate to="/login" replace />;
  }

  // ============================================================
  // NOT LOGGED IN
  // ============================================================

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // ============================================================
  // CHECKING ACCOUNT ACCESS
  // ============================================================

  if (accessChecking) {
    return (
      <Loader
        fullScreen={true}
        size="large"
        text="Checking access..."
      />
    );
  }

  // ============================================================
  // PROFILE VERIFICATION FAILED
  // ============================================================

  if (accessError) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          reason: "verification_failed",
        }}
      />
    );
  }

  // ============================================================
  // BLOCKED USER
  //
  // IMPORTANT:
  // This check applies regardless of role.
  //
  // mentor + is_blocked = true
  //        → /access-denied
  //
  // campus_manager + is_blocked = true
  //        → /access-denied
  // ============================================================

  if (isBlocked) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          reason: "blocked",
        }}
      />
    );
  }

  // ============================================================
  // CHECK EMAIL
  // ============================================================

  const email =
    session.user?.email?.toLowerCase();

  const isKalviumUser =
    email?.endsWith("@kalvium.community");

  const isDeveloper =
    email &&
    ALLOWED_USERS.includes(email);

  // ============================================================
  // UNAUTHORIZED USER
  // ============================================================

  if (!isKalviumUser && !isDeveloper) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          reason: "unauthorized",
        }}
      />
    );
  }

  // ============================================================
  // ACCESS GRANTED
  // ============================================================

  return <Outlet />;
};

export default ProtectedRoute;