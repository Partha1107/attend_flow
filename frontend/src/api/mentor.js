import { supabase } from "../lib/supabase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

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

const readResponse = async (response, fallbackMessage) => {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
};

export const getMentorProfile = async () => {
  const response = await fetch(`${API_URL}/api/mentor/profile`, {
    headers: await getAuthHeaders(),
  });

  if (response.status === 404) {
    return { exists: false, profile: null };
  }

  const result = await readResponse(
    response,
    "Failed to load mentor profile."
  );

  return {
    exists: true,
    profile: result.profile,
  };
};

export const saveMentorProfile = async ({ collegeName, squad }) => {
  const response = await fetch(`${API_URL}/api/mentor/profile`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ collegeName, squad }),
  });

  return readResponse(response, "Failed to save mentor profile.");
};

export const getMentorStudents = async () => {
  const response = await fetch(
    `${API_URL}/api/mentor/dashboard/students`,
    { headers: await getAuthHeaders() }
  );

  return readResponse(response, "Failed to load students.");
};

export const getMentorEmailAlerts = async () => {
  const response = await fetch(`${API_URL}/api/attendance/email-alerts`, {
    headers: await getAuthHeaders(),
  });

  return readResponse(response, "Failed to load email alert details.");
};
