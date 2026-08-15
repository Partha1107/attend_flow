import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { ALLOWED_USERS } from "../constants/allowedUsers";

const ProtectedRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

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

  return <Outlet />;
};

export default ProtectedRoute;