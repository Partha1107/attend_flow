import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { supabase, supabaseConfigError } from "../../lib/supabase";
import "./AttendanceRecords.css";

const AttendanceRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  const fetchRecords = useCallback(async () => {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [attendanceResult, growthHourResult] = await Promise.all([
        supabase
          .from("attendance")
          .select("*, students(name, email), subjects(name)")
          .order("updated_at", { ascending: false })
          .limit(300),
        supabase
          .from("growth_hour_attendance")
          .select("*, students(name, email)")
          .order("updated_at", { ascending: false })
          .limit(300),
      ]);

      if (attendanceResult.error) {
        throw new Error(attendanceResult.error.message);
      }

      if (growthHourResult.error) {
        throw new Error(growthHourResult.error.message);
      }

      const growthHourRecords = (growthHourResult.data || []).map((record) => ({
        ...record,
        subjects: { name: "Growth Hour" },
      }));

      setRecords([...(attendanceResult.data || []), ...growthHourRecords]);
    } catch (err) {
      console.error("Failed to fetch attendance records:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRecords();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((record) => {
      const searchableText = [
        record.students?.email,
        record.students?.name,
        record.subjects?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const percentage = Number(record.attendance_percentage) || 0;
      const matchesAttendance =
        attendanceFilter === "all" ||
        (attendanceFilter === "below-75"
          ? percentage < 75
          : percentage >= 75);

      return searchableText.includes(q) && matchesAttendance;
    });
  }, [records, search, attendanceFilter]);

  const stats = useMemo(() => {
    const counts = { total: filteredRecords.length };
    filteredRecords.forEach((r) => {
      const status =
        Number(r.attendance_percentage) < 75 ? "below75" : "above75";
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [filteredRecords]);

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
  };

  return (
    <div className="records-page">
      <div className="records-header">
        <div>
          <h1>Attendance Records</h1>
          <p>View attendance records imported from Excel files.</p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={fetchRecords}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="records-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by student email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="status-select"
          value={attendanceFilter}
          onChange={(e) => setAttendanceFilter(e.target.value)}
        >
          <option value="all">All Attendance</option>
          <option value="below-75">Below 75%</option>
          <option value="above-75">75% and above</option>
        </select>
      </div>

      <div className="records-stats">
        <div className="stat-box">
          <span>Total Records</span>
          <strong>{stats.total || 0}</strong>
        </div>
        <div className="stat-box present">
          <span>75% and above</span>
          <strong>{stats.above75 || 0}</strong>
        </div>
        <div className="stat-box absent">
          <span>Below 75%</span>
          <strong>{stats.below75 || 0}</strong>
        </div>
        <div className="stat-box flags">
          <span>Imported Subjects</span>
          <strong>{stats.total || 0}</strong>
        </div>
      </div>

      {error && <div className="records-error">{error}</div>}

      {loading ? (
        <div className="records-loading">Loading attendance records...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="records-empty">
          No attendance records found. Import an Excel file to get started.
        </div>
      ) : (
        <div className="records-table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Academic Year</th>
                <th>Subject</th>
                <th>Attendance</th>
                <th>Sessions</th>
                <th>Flags</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => {
                const percentage = Number(r.attendance_percentage) || 0;
                const status = percentage < 75 ? "below75" : "above75";
                const flags = [];
                if (r.sessions_marked_od) flags.push(`OD (${r.sessions_marked_od})`);
                if (r.sessions_medical_leave) flags.push(`ML (${r.sessions_medical_leave})`);
                if (r.sessions_applied_leave) flags.push(`LI (${r.sessions_applied_leave})`);

                return (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.students?.name || "—"}</strong>
                      <br />
                      <span className="email-cell">{r.students?.email || "—"}</span>
                    </td>
                    <td>{r.academic_year || "—"}</td>
                    <td>{r.subjects?.name || "—"}</td>
                    <td>
                      <span className={`status-badge ${status}`}>
                        {percentage.toFixed(2)}%
                      </span>
                    </td>
                    <td>{r.sessions_attended || 0} / {r.sessions_conducted || 0}</td>
                    <td>
                      {flags.length === 0 ? (
                        <span className="no-flags">—</span>
                      ) : (
                        <div className="flag-list">
                          {flags.map((f) => (
                            <span key={f} className={`flag-chip flag-${f.slice(0, 2).toLowerCase()}`}>
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(r.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceRecords;