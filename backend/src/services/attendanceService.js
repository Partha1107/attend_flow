const { supabase } = require("../lib/supabase");

/**
 * Store attendance records from an Excel import.
 * Creates sessions and attendance records, prevents duplicates.
 */
async function importAttendance({ filename, records, warnings }) {
  if (!records || records.length === 0) {
    return {
      success: false,
      error: "No attendance records to import.",
    };
  }

  // Build unique sessions: date + start_at + end_at + subject_title
  const sessionMap = new Map();
  records.forEach((r) => {
    const key = `${r.date}|${r.start_at || ""}|${r.end_at || ""}|${r.subject_title.toLowerCase()}`;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        date: r.date,
        start_at: r.start_at,
        end_at: r.end_at,
        subject_title: r.subject_title,
      });
    }
  });

  const sessions = Array.from(sessionMap.values());

  // Insert sessions (upsert to avoid duplicates)
  const { data: insertedSessions, error: sessionError } = await supabase
    .from("sessions")
    .upsert(sessions, { onConflict: "date,start_at,end_at,subject_title" })
    .select("id,date,start_at,end_at,subject_title");

  if (sessionError) {
    return {
      success: false,
      error: `Failed to store sessions: ${sessionError.message}`,
    };
  }

  // Map session keys to IDs
  const sessionIdMap = new Map();
  insertedSessions.forEach((s) => {
    const key = `${s.date}|${s.start_at || ""}|${s.end_at || ""}|${s.subject_title.toLowerCase()}`;
    sessionIdMap.set(key, s.id);
  });

  // Build attendance records with session_id
  const attendanceRecords = records.map((r) => {
    const key = `${r.date}|${r.start_at || ""}|${r.end_at || ""}|${r.subject_title.toLowerCase()}`;
    return {
      student_email: r.email,
      session_id: sessionIdMap.get(key),
      attendance: r.attendance,
      is_OD: r.is_OD,
      is_ML: r.is_ML,
      is_LI: r.is_LI,
    };
  });

  // Insert attendance records (upsert to prevent duplicates)
  const { error: attendanceError } = await supabase
    .from("attendance_records")
    .upsert(attendanceRecords, {
      onConflict: "student_email,session_id",
    });

  if (attendanceError) {
    return {
      success: false,
      error: `Failed to store attendance records: ${attendanceError.message}`,
    };
  }

  // Compute summary
  const uniqueStudents = new Set(records.map((r) => r.email));
  const uniqueSubjects = new Set(records.map((r) => r.subject_title));
  const dates = records.map((r) => r.date).sort();
  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];

  // Save import metadata
  const { error: importError } = await supabase.from("attendance_imports").insert({
    filename,
    date_from: dateFrom,
    date_to: dateTo,
    student_count: uniqueStudents.size,
    subject_count: uniqueSubjects.size,
    session_count: sessions.length,
    record_count: records.length,
    warning_count: warnings.length,
    status: "success",
  });

  if (importError) {
    console.error("Failed to save import metadata:", importError.message);
  }

  return {
    success: true,
    summary: {
      filename,
      date_from: dateFrom,
      date_to: dateTo,
      student_count: uniqueStudents.size,
      subject_count: uniqueSubjects.size,
      session_count: sessions.length,
      record_count: records.length,
      warning_count: warnings.length,
      status: "success",
    },
  };
}

/**
 * Get recent imports for the UI.
 */
async function getRecentImports(limit = 10) {
  const { data, error } = await supabase
    .from("attendance_imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data, error: null };
}

module.exports = { importAttendance, getRecentImports };