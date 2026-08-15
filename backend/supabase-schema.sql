-- ============================================
-- Attendance Import Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Sessions table: unique session identified by date + start_at + end_at + subject_title
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_at TIME,
  end_at TIME,
  subject_title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (date, start_at, end_at, subject_title)
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  attendance TEXT NOT NULL,
  is_OD BOOLEAN DEFAULT false,
  is_ML BOOLEAN DEFAULT false,
  is_LI BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_email, session_id)
);

-- Import metadata table
CREATE TABLE IF NOT EXISTS attendance_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  date_from DATE,
  date_to DATE,
  student_count INTEGER DEFAULT 0,
  subject_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  record_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_email ON attendance_records(student_email);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_imports_created_at ON attendance_imports(created_at DESC);