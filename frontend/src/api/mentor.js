import { supabase } from "../lib/supabase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";


// =====================================================
// AUTH HEADERS
// =====================================================

const getAuthHeaders = async () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session?.access_token) {
    throw new Error("You are not authenticated.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
};


// =====================================================
// RESPONSE HANDLER
// =====================================================

const readResponse = async (response, fallbackMessage) => {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
};


// =====================================================
// GET MENTOR ROLE
// =====================================================

export const getMentorRole = async () => {
  console.log(
    "🔥 ROLE API URL:",
    `${API_URL}/api/mentor/role`
  );

  const response = await fetch(
    `${API_URL}/api/mentor/role`,
    {
      method: "GET",
      headers: await getAuthHeaders(),
    }
  );

  console.log(
    "🔥 ROLE API STATUS:",
    response.status
  );

  const result = await response.json();

  console.log(
    "🔥 ROLE API RESPONSE:",
    result
  );

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to load mentor role."
    );
  }

  return result;
};


// =====================================================
// SAVE / UPDATE MENTOR PROFILE
// =====================================================

export const saveMentorProfile = async ({
  collegeName,
  squad,
  jobRole,
}) => {
  const response = await fetch(
    `${API_URL}/api/mentor/profile`,
    {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        collegeName,
        squad,
        jobRole,
      }),
    }
  );

  return readResponse(
    response,
    "Failed to save mentor profile."
  );
};


// =====================================================
// GET MENTOR STUDENTS
// =====================================================

export const getMentorStudents = async (squad = "") => {
  const query = squad
    ? `?squad=${encodeURIComponent(squad)}`
    : "";

  let headers = await getAuthHeaders();

  let response = await fetch(
    `${API_URL}/api/mentor/dashboard/students${query}`,
    {
      method: "GET",
      headers,
    }
  );

  // Refresh token if API returns 401
  if (response.status === 401) {
    console.warn(
      "Student API returned 401. Refreshing Supabase session..."
    );

    const { data, error } =
      await supabase.auth.refreshSession();

    if (error) {
      console.error(
        "Supabase session refresh failed:",
        error
      );

      throw new Error(
        "Your login session has expired. Please log in again."
      );
    }

    const newToken =
      data?.session?.access_token;

    if (!newToken) {
      throw new Error(
        "Unable to refresh login session. Please log in again."
      );
    }

    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${newToken}`,
    };

    response = await fetch(
      `${API_URL}/api/mentor/dashboard/students${query}`,
      {
        method: "GET",
        headers,
      }
    );
  }

  return readResponse(
    response,
    "Failed to load students."
  );
};


// =====================================================
// GET EMAIL ALERTS
// =====================================================

export const getMentorEmailAlerts = async () => {
  const response = await fetch(
    `${API_URL}/api/attendance/email-alerts`,
    {
      headers: await getAuthHeaders(),
    }
  );

  return readResponse(
    response,
    "Failed to load email alert details."
  );
};