import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { ALLOWED_USERS } from "../constants/allowedUsers";
import { getMentorProfile } from "../api/mentor";
import Loader from "../components/Loader";

const ProtectedRoute = () => {
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  // ============================================================
  // ACCESS CONTROL STATE
  // ============================================================

  const [accessChecking, setAccessChecking] = useState(false);

  // IMPORTANT:
  // Prevents protected pages from rendering before
  // mentor profile verification is completed.
  const [accessResolved, setAccessResolved] = useState(false);

  const [isBlocked, setIsBlocked] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
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
  // CHECK ACCOUNT ACCESS
  //
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
      // Start access verification
      setAccessChecking(true);
      setAccessResolved(false);

      // Reset previous access state
      setAccessError(false);
      setProfileMissing(false);
      setIsBlocked(false);

      try {
        const result = await getMentorProfile();

        

        if (!mounted) return;

        // ========================================================
        // CHECK PROFILE
        // ========================================================

        const profile = result?.profile;

        if (!profile) {
          console.warn(
            "⚠️ User profile not found. Redirecting to profile settings."
          );

          setProfileMissing(true);
          return;
        }

        // ========================================================
        // CHECK BLOCK STATUS
        // ========================================================

        const blocked =
          profile.is_blocked === true;

        

        setIsBlocked(blocked);
      } catch (error) {
        console.error(
          "❌ User access check error:",
          error
        );

        if (mounted) {
          // Fail closed.
          // If account status cannot be verified,
          // do not grant access.
          setAccessError(true);
        }
      } finally {
        if (mounted) {
          setAccessChecking(false);

          // IMPORTANT:
          // Only after profile verification finishes,
          // protected pages are allowed to render.
          setAccessResolved(true);
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
  // ACCESS CHECK NOT COMPLETED
  //
  // IMPORTANT:
  // This prevents Dashboard from mounting early.
  //
  // Without this, Dashboard can call:
  //
  // /api/mentor/dashboard/students
  //
  // before mentor profile verification finishes.
  // ============================================================

  if (!accessResolved) {
    return (
      <Loader
        fullScreen={true}
        size="large"
        text="Checking access..."
      />
    );
  }

  // ============================================================
  // ACCESS CHECKING
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
  // PROFILE DOES NOT EXIST
  // ============================================================

  if (profileMissing) {
  // Allow the profile setup page to render.
  // The user has no profile yet, so they need this page
  // to create one.
  if (location.pathname === "/mentor/setup") {
    return <Outlet />;
  }

  return (
    <Navigate
      to="/mentor/setup"
      replace
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
  // Applies regardless of role:
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