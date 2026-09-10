import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";
import { getMentorStudents } from "../../api/mentor";
import "./ParentEmailImport.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_ORDER = [
  "Ready",
  "Updated",
  "Student Not Found",
  "Duplicate Name",
  "Invalid Email",
  "Empty Row",
];

const normalizeColumn = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[\s_-]+/g, "");

const normalizeName = (value) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .toLowerCase();

const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || "").trim());

const getColumn = (headers, candidates) => headers.find((header) =>
  candidates.includes(normalizeColumn(header))
);

const buildSummary = (rows) => STATUS_ORDER.reduce((summary, status) => {
  summary[status] = rows.filter((row) => row.status === status).length;
  return summary;
}, {});

const getAuthHeaders = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error(error?.message || "You are not authenticated.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
};

function ParentEmailImport() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  const validateFile = async (file) => {
    setError("");
    setSuccess("");
    setHasValidated(false);

    if (!file) {
      setError("Please select an Excel file.");
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Unsupported file format. Please upload an .xlsx or .xls file.");
      return;
    }

    setLoading(true);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        throw new Error("The Excel file is empty.");
      }

      const spreadsheetRows = XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: false,
      });

      if (spreadsheetRows.length === 0) {
        throw new Error("The Excel file does not contain any rows.");
      }

      const headers = Object.keys(spreadsheetRows[0]);
      const studentNameColumn = getColumn(headers, ["studentname", "name"]);
      const parentEmailColumn = getColumn(headers, [
        "parentemail",
        "parentemailaddress",
      ]);

      if (!studentNameColumn) {
        throw new Error("Missing Student Name column.");
      }

      if (!parentEmailColumn) {
        throw new Error("Missing Parent Email column.");
      }

      const studentResult = await getMentorStudents();
      const studentsByName = new Map();

      for (const student of studentResult.students || []) {
        const normalizedName = normalizeName(student.name);
        const matches = studentsByName.get(normalizedName) || [];
        matches.push(student);
        studentsByName.set(normalizedName, matches);
      }

      const parsedRows = spreadsheetRows.map((spreadsheetRow, index) => {
        const name = String(spreadsheetRow[studentNameColumn] || "").trim();
        const parentEmail = String(spreadsheetRow[parentEmailColumn] || "").trim();
        const isEmpty = !name && !parentEmail;
        const matches = studentsByName.get(normalizeName(name)) || [];

        let status = "Ready";
        let matchingStudent = matches[0]?.name || "-";

        if (isEmpty) {
          status = "Empty Row";
        } else if (!isValidEmail(parentEmail)) {
          status = "Invalid Email";
        } else if (matches.length === 0) {
          status = "Student Not Found";
        } else if (matches.length > 1) {
          status = "Duplicate Name";
          matchingStudent = `${matches.length} matches`;
        }

        return {
          id: `${file.name}-${index}`,
          name,
          parentEmail,
          matchingStudent,
          status,
        };
      });

      setRows(parsedRows);
      setFileName(file.name);
      setHasValidated(true);
    } catch (validationError) {
      setRows([]);
      setFileName(file.name);
      setError(validationError.message || "Failed to validate the Excel file.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const [file] = event.target.files;
    setFileName(file?.name || "");
    void validateFile(file);
  };

  const importParentEmails = async () => {
    const readyRows = rows.filter((row) => row.status === "Ready");

    if (!readyRows.length) {
      setError("There are no valid matched students ready to import.");
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/parent-email/import`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          students: rows.map((row) => ({
            name: row.name,
            parentEmail: row.parentEmail,
          })),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Parent email import failed.");
      }

      const importedResult = result.result;
      setRows((currentRows) => currentRows.map((row) => (
        row.status === "Ready" ? { ...row, status: "Updated" } : row
      )));
      setSuccess(
        `Import completed: ${importedResult.updated} updated, `
        + `${importedResult.notFound} not found, `
        + `${importedResult.duplicateNames} duplicate names, `
        + `${importedResult.invalidEmails} invalid emails, `
        + `${importedResult.skipped} skipped.`
      );
      window.dispatchEvent(new CustomEvent("parentEmailImportCompleted"));
    } catch (importError) {
      setError(importError.message || "Failed to import parent emails.");
    } finally {
      setImporting(false);
    }
  };

  const summary = buildSummary(rows);
  const readyCount = summary.Ready;

  return (
    <section className="parent-email-page">
      <header className="parent-email-header">
        <div>
          <h1>Parent Email Import</h1>
          <p>Upload an Excel file to automatically update parent email addresses for existing students.</p>
        </div>
      </header>

      <div className="parent-email-card parent-email-upload-card">
        <div className="parent-email-upload-icon"><FileSpreadsheet size={28} /></div>
        <h2>Upload parent email spreadsheet</h2>
        <p>Supported formats: .xlsx and .xls</p>
        <input
          ref={fileInputRef}
          className="parent-email-file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        <button
          className="parent-email-secondary-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={17} />
          Choose Excel File
        </button>
        {fileName && <div className="parent-email-file-name">{fileName}</div>}
        <button
          className="parent-email-primary-button"
          type="button"
          onClick={() => void validateFile(fileInputRef.current?.files?.[0])}
          disabled={loading || !fileName}
        >
          {loading ? "Validating..." : "Validate File"}
        </button>
      </div>

      {error && <div className="parent-email-message parent-email-error">{error}</div>}
      {success && <div className="parent-email-message parent-email-success">{success}</div>}

      {hasValidated && (
        <>
          <div className="parent-email-card parent-email-summary-card">
            <h2>Import Summary</h2>
            <div className="parent-email-summary-grid">
              <div><strong>{rows.length}</strong><span>Total Rows</span></div>
              <div><strong>{readyCount}</strong><span>Ready to Import</span></div>
              <div><strong>{summary["Student Not Found"]}</strong><span>Student Not Found</span></div>
              <div><strong>{summary["Duplicate Name"]}</strong><span>Duplicate Name</span></div>
              <div><strong>{summary["Invalid Email"]}</strong><span>Invalid Email</span></div>
              <div><strong>{summary["Empty Row"]}</strong><span>Empty Row</span></div>
            </div>
          </div>

          <div className="parent-email-card parent-email-preview-card">
            <div className="parent-email-preview-header">
              <h2>Preview</h2>
              <button
                className="parent-email-primary-button"
                type="button"
                onClick={() => void importParentEmails()}
                disabled={importing || readyCount === 0}
              >
                {importing ? "Importing..." : "Import Parent Emails"}
              </button>
            </div>
            <div className="parent-email-table-wrapper">
              <table className="parent-email-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Parent Email</th>
                    <th>Matching Student</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name || "-"}</td>
                      <td>{row.parentEmail || "-"}</td>
                      <td>{row.matchingStudent}</td>
                      <td><span className={`parent-email-status status-${row.status.toLowerCase().replace(/\s+/g, "-")}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default ParentEmailImport;
