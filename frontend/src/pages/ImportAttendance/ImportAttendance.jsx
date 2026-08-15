import { useState, useRef, useEffect } from "react";
import "./ImportAttendance.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ImportAttendance = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [recentImports, setRecentImports] = useState([]);
  const fileInputRef = useRef(null);

  const fetchRecentImports = () => {
    fetch(`${API_BASE}/api/attendance/imports`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRecentImports(data.imports || []);
        }
      })
      .catch((err) => console.error("Failed to fetch recent imports:", err));
  };

  useEffect(() => {
    fetchRecentImports();
  }, []);

  const validateFile = (selected) => {
    const ext = selected.name.toLowerCase().slice(selected.name.lastIndexOf("."));
    if (![".xlsx", ".xls"].includes(ext)) {
      setError("Unsupported file type. Please upload a .xlsx or .xls file.");
      setFile(null);
      return false;
    }
    setError("");
    setFile(selected);
    setResult(null);
    return true;
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) validateFile(selected);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an Excel file first.");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/attendance/import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed.");
        setResult(null);
        return;
      }

      setResult(data.summary);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchRecentImports();
    } catch (err) {
      console.error("Upload error:", err);
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  };

  return (
    <div className="import-page">
      <div className="import-header">
        <h1>Import Attendance</h1>
        <p>Upload an Excel file with attendance records to import them into the system.</p>
      </div>

      {/* Upload Area */}
      <div
        className={`upload-area ${dragActive ? "drag-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          hidden
        />

        <div className="upload-icon">📄</div>
        <p className="upload-title">
          {file ? file.name : "Drag & drop your Excel file here"}
        </p>
        <p className="upload-subtitle">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB`
            : "or click to browse — .xlsx / .xls supported"}
        </p>

        {file && (
          <button
            type="button"
            className="upload-button"
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={uploading}
          >
            {uploading ? "Importing..." : "Import Attendance"}
          </button>
        )}
      </div>

      {error && <div className="import-error">{error}</div>}

      {/* Import Summary */}
      {result && (
        <div className="import-summary">
          <h2>Import Successful</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">File</span>
              <span className="summary-value">{result.filename}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Date Range</span>
              <span className="summary-value">
                {formatDate(result.date_from)} — {formatDate(result.date_to)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Students</span>
              <span className="summary-value">{result.student_count}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Subjects</span>
              <span className="summary-value">{result.subject_count}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Sessions</span>
              <span className="summary-value">{result.session_count}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Records</span>
              <span className="summary-value">{result.record_count}</span>
            </div>
          </div>
          {result.warning_count > 0 && (
            <p className="summary-warning">
              ⚠️ {result.warning_count} warning(s) — some rows were skipped.
            </p>
          )}
        </div>
      )}

      {/* Recent Imports */}
      <div className="recent-imports">
        <h2>Recent Imports</h2>
        {recentImports.length === 0 ? (
          <p className="no-imports">No imports yet.</p>
        ) : (
          <table className="imports-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Date Range</th>
                <th>Students</th>
                <th>Sessions</th>
                <th>Records</th>
                <th>Imported At</th>
              </tr>
            </thead>
            <tbody>
              {recentImports.map((imp) => (
                <tr key={imp.id}>
                  <td>{imp.filename}</td>
                  <td>
                    {formatDate(imp.date_from)} — {formatDate(imp.date_to)}
                  </td>
                  <td>{imp.student_count}</td>
                  <td>{imp.session_count}</td>
                  <td>{imp.record_count}</td>
                  <td>{new Date(imp.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ImportAttendance;