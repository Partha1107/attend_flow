import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { ALLOWED_USERS } from "../constants/allowedUsers";
import { getMentorProfile } from "../api/mentor";

const ProtectedRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) {
          setSession(nextSession);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      loading ||
      !session ||
      location.pathname === "/mentor/setup"
    ) {
      return undefined;
    }

    let mounted = true;

    const checkMentorProfile = async () => {
      try {
        setProfileLoading(true);
        const result = await getMentorProfile();

        if (mounted && !result.exists) {
          navigate("/mentor/setup", { replace: true });
        }
      } catch (profileCheckError) {
        console.error("Mentor profile check error:", profileCheckError);

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
  }, [loading, location.pathname, navigate, session]);

  if (loading) {
    return (
      <div>
        Checking authentication...
      </div>
    );
  }

  if (!supabase) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const email =
    session.user?.email?.toLowerCase();

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

  if (profileLoading) {
    return <div>Loading mentor profile...</div>;
  }

  if (profileError) {
    return <div>{profileError}</div>;
  }

  return <Outlet />;
};

export default ProtectedRoute;