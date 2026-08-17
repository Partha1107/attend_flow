import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { supabase, supabaseConfigError } from "../../lib/supabase";
import "./AttendanceRecords.css";

const STATUS_LABELS = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  OD: "On Duty",
  ML: "Medical Leave",
  LI: "Leave",
};

const AttendanceRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const fetchRecords = useCallback(async () => {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("attendance_records")
        .select("*, sessions(*)")
        .order("created_at", { ascending: false })
        .limit(300);

      if (statusFilter !== "all") {
        query = query.eq("attendance", statusFilter);
      }

      if (dateFilter) {
        query = query.eq("sessions.date", dateFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw new Error(queryError.message);

      setRecords(data || []);
    } catch (err) {
      console.error("Failed to fetch attendance records:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      r.student_email.toLowerCase().includes(q)
    );
  }, [records, search]);

  const stats = useMemo(() => {
    const counts = { total: filteredRecords.length };
    filteredRecords.forEach((r) => {
      const status = (r.attendance || "unknown").toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [filteredRecords]);

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
  };

  const formatTime = (value) => {
    if (!value) return "—";
    const [h, m] = String(value).split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${ampm}`;
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="OD">On Duty (OD)</option>
          <option value="ML">Medical Leave (ML)</option>
          <option value="LI">Leave (LI)</option>
        </select>

        <input
          type="date"
          className="date-filter"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      <div className="records-stats">
        <div className="stat-box">
          <span>Total Records</span>
          <strong>{stats.total || 0}</strong>
        </div>
        <div className="stat-box present">
          <span>Present</span>
          <strong>{stats.present || 0}</strong>
        </div>
        <div className="stat-box absent">
          <span>Absent</span>
          <strong>{stats.absent || 0}</strong>
        </div>
        <div className="stat-box late">
          <span>Late</span>
          <strong>{stats.late || 0}</strong>
        </div>
        <div className="stat-box flags">
          <span>OD / ML / LI</span>
          <strong>
            {(stats.od || 0) + (stats.ml || 0) + (stats.li || 0)}
          </strong>
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
                <th>Student Email</th>
                <th>Date</th>
                <th>Subject</th>
                <th>Time</th>
                <th>Status</th>
                <th>Flags</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => {
                const session = r.sessions;
                const status = (r.attendance || "unknown").toLowerCase();
                const badgeClass = status.replace(/[^a-z0-9]/gi, "");
                const flags = [];
                if (r.is_OD) flags.push("OD");
                if (r.is_ML) flags.push("ML");
                if (r.is_LI) flags.push("LI");

                return (
                  <tr key={r.id}>
                    <td className="email-cell">{r.student_email}</td>
                    <td>{formatDate(session?.date)}</td>
                    <td>{session?.subject_title || "—"}</td>
                    <td>
                      {formatTime(session?.start_at)}
                      {session?.end_at
                        ? ` — ${formatTime(session.end_at)}`
                        : ""}
                    </td>
                    <td>
                      <span className={`status-badge ${badgeClass}`}>
                        {STATUS_LABELS[r.attendance] || r.attendance}
                      </span>
                    </td>
                    <td>
                      {flags.length === 0 ? (
                        <span className="no-flags">—</span>
                      ) : (
                        <div className="flag-list">
                          {flags.map((f) => (
                            <span key={f} className={`flag-chip flag-${f.toLowerCase()}`}>
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
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