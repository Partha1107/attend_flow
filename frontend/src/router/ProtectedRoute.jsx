import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { supabase } from "../lib/supabase";
import { ALLOWED_USERS } from "../constants/allowedUsers";
import { getMentorProfile } from "../api/mentor";

const ProtectedRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  const [profileLoading, setProfileLoading] = useState(Boolean(supabase));
  const [profileError, setProfileError] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  // Prevent mentor profile from being checked again
  // every time the route changes.
  const checkedUserId = useRef(null);

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
  // MENTOR PROFILE CHECK
  // ============================================================

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!session) {
      return;
    }

    // Don't check the profile on mentor setup page.
    if (location.pathname === "/mentor/setup") {
      return;
    }

    const userId = session.user?.id;

    if (!userId) {
      return;
    }

    // IMPORTANT:
    // If this user has already been checked,
    // do NOT check again when pathname changes.
    if (checkedUserId.current === userId) {
      return;
    }

    let mounted = true;

    const checkMentorProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError("");

        console.log("Checking mentor profile...");

        const result = await getMentorProfile();

        console.log("Mentor profile result:", result);

        if (!mounted) return;

        if (!result.exists) {
          navigate("/mentor/setup", {
            replace: true,
          });

          return;
        }

        // Mark this user as checked.
        checkedUserId.current = userId;

        console.log("Mentor profile verified.");
      } catch (profileCheckError) {
        console.error(
          "Mentor profile check error:",
          profileCheckError
        );

        if (mounted) {
          setProfileError(
            profileCheckError.message ||
              "Unable to verify your mentor profile."
          );
        }
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    void checkMentorProfile();

    return () => {
      mounted = false;
    };
  }, [
    loading,
    session,
    location.pathname,
    navigate,
  ]);

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
  // CHECK ALLOWED MENTOR EMAIL
  // ============================================================

  const email = session.user?.email?.toLowerCase();

  if (
    !email ||
    !ALLOWED_USERS.includes(email)
  ) {
    return (
      <Navigate
        to="/access-denied"
        replace
      />
    );
  }

  // ============================================================
  // MENTOR PROFILE CHECKING
  // ============================================================

  if (
    profileLoading &&
    location.pathname !== "/mentor/setup"
  ) {
    return (
      <div>
        Loading mentor profile...
      </div>
    );
  }

  // ============================================================
  // PROFILE ERROR
  // ============================================================

  if (profileError) {
    return (
      <div>
        {profileError}
      </div>
    );
  }

  // ============================================================
  // RENDER PAGE
  // ============================================================

  return <Outlet />;
};

export default ProtectedRoute;