import { useState } from "react";
import { FileSpreadsheet, Upload, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import "./ImportAttendance.css";

/*
 * --------------------------------------------------
 * CONSTANT COLUMNS
 * --------------------------------------------------
 *
 * These columns exist for every student.
 */
const CONSTANT_COLUMNS = ["email", "Name", "Squad"];

/*
 * --------------------------------------------------
 * SUBJECT FIELDS
 * --------------------------------------------------
 *
 * Every detected subject must contain these fields.
 *
 * The number of subjects can change every academic year.
 */
const SUBJECT_FIELDS = [
  "Name",
  "ID",
  "Sessions Conducted",
  "Sessions Attended",
  "Sessions Absent",
  "Attendance %",
  "Sessions Marked OD",
  "Sessions on Approved Medical Leave (ML)",
  "Sessions Applied Leave",
];

/*
 * --------------------------------------------------
 * API URL
 * --------------------------------------------------
 *
 * Falls back to localhost for local dev. Set
 * VITE_API_URL in your .env for other environments.
 */
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

/*
 * --------------------------------------------------
 * DETECT SUBJECTS
 * --------------------------------------------------
 *
 * Example Excel columns:
 *
 * Subject 1 Name
 * Subject 1 ID
 * Subject 2 Name
 * Subject 2 ID
 *
 * Returns:
 *
 * [1, 2]
 *
 * This allows the number of subjects to change
 * every academic year.
 */
const detectSubjects = (columns) => {
  const subjectNumbers = new Set();

  columns.forEach((column) => {
    const match = column.match(/^Subject (\d+) /);

    if (match) {
      subjectNumbers.add(Number(match[1]));
    }
  });

  return [...subjectNumbers].sort((a, b) => a - b);
};

/*
 * --------------------------------------------------
 * TRANSFORM EXCEL DATA
 * --------------------------------------------------
 *
 * Converts Excel rows into the structure expected
 * by our backend.
 *
 * Excel:
 *
 * email
 * Name
 * Squad
 * Subject 1 Name
 * Subject 1 ID
 * ...
 *
 * Becomes:
 *
 * {
 *   email,
 *   name,
 *   squad,
 *   subjects: [...]
 * }
 *
 * NOTE: "Growth Hour" is allowed through even though
 * it has no Subject ID, since the backend treats a
 * nameless-ID subject named "Growth Hour" as a special
 * case. Every other subject without an ID is dropped.
 */
const transformAttendanceData = (data, subjectNumbers) => {
  return data.map((row) => {
    const subjects = subjectNumbers
      .map((subjectNumber) => {
        const prefix = `Subject ${subjectNumber}`;

        const subjectId = row[`${prefix} ID`];
        const subjectName = String(
          row[`${prefix} Name`] || ""
        ).trim();

        const hasNoId =
          subjectId === undefined ||
          subjectId === null ||
          String(subjectId).trim() === "";

        const isGrowthHour =
          subjectName.toLowerCase() === "growth hour";

        /*
         * If the subject doesn't have an ID and isn't
         * Growth Hour, don't send it to the backend.
         */
        if (hasNoId && !isGrowthHour) {
          return null;
        }

        return {
          name: subjectName,

          id: hasNoId ? null : String(subjectId).trim(),

          sessionsConducted:
            Number(row[`${prefix} Sessions Conducted`]) || 0,

          sessionsAttended:
            Number(row[`${prefix} Sessions Attended`]) || 0,

          sessionsAbsent:
            Number(row[`${prefix} Sessions Absent`]) || 0,

          attendancePercentage:
            Number(row[`${prefix} Attendance %`]) || 0,

          sessionsMarkedOD:
            Number(row[`${prefix} Sessions Marked OD`]) || 0,

          sessionsMedicalLeave:
            Number(
              row[
                `${prefix} Sessions on Approved Medical Leave (ML)`
              ]
            ) || 0,

          sessionsAppliedLeave:
            Number(row[`${prefix} Sessions Applied Leave`]) || 0,
        };
      })
      .filter(Boolean);

    return {
      email: String(row.email || "").trim(),
      name: String(row.Name || "").trim(),
      squad: String(row.Squad || "").trim(),
      subjects,
    };
  });
};

function ImportAttendance() {
  const [fileName, setFileName] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  // Data parsed from the file, awaiting confirmation.
  const [previewData, setPreviewData] = useState([]);

  // Set to true once the user has reviewed the preview
  // and the data is ready to send.
  const [isReadyToImport, setIsReadyToImport] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  /*
   * --------------------------------------------------
   * RESET STATE
   * --------------------------------------------------
   */
  const resetImportState = () => {
    setPreviewData([]);
    setIsReadyToImport(false);
    setError("");
    setSuccess("");
  };

  /*
   * --------------------------------------------------
   * HANDLE FILE CHANGE
   * --------------------------------------------------
   *
   * STEP 1 of 2: parse + validate the file and show a
   * preview. This does NOT talk to the backend/Supabase.
   * Nothing is written until the user clicks "Import Now".
   */
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    resetImportState();

    /*
     * Academic year is required because the backend
     * uses it to determine whether attendance should
     * be inserted or updated.
     */
    if (!academicYear) {
      setError(
        "Please select an academic year before uploading."
      );

      return;
    }

    setIsParsing(true);

    try {
      /*
       * --------------------------------------------------
       * STEP A: READ EXCEL FILE
       * --------------------------------------------------
       */

      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
      });

      /*
       * --------------------------------------------------
       * STEP B: CHECK SHEETS
       * --------------------------------------------------
       */

      if (!workbook.SheetNames.length) {
        setError("The Excel file does not contain any sheets.");
        return;
      }

      /*
       * --------------------------------------------------
       * STEP C: GET FIRST SHEET
       * --------------------------------------------------
       */

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      /*
       * --------------------------------------------------
       * STEP D: CONVERT EXCEL → JAVASCRIPT
       * --------------------------------------------------
       */

      const data = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      /*
       * --------------------------------------------------
       * STEP E: CHECK EMPTY SHEET
       * --------------------------------------------------
       */

      if (data.length === 0) {
        setError("The Excel sheet is empty.");
        return;
      }

      /*
       * --------------------------------------------------
       * STEP F: GET EXCEL COLUMNS
       * --------------------------------------------------
       */

      const actualColumns = Object.keys(data[0]);

      console.log("Excel columns:", actualColumns);

      /*
       * --------------------------------------------------
       * STEP G: VALIDATE CONSTANT COLUMNS
       * --------------------------------------------------
       */

      const missingConstantColumns = CONSTANT_COLUMNS.filter(
        (column) => !actualColumns.includes(column)
      );

      if (missingConstantColumns.length > 0) {
        setError(
          `Invalid Excel file. Missing required column(s): ${missingConstantColumns.join(
            ", "
          )}`
        );

        console.error(
          "Missing constant columns:",
          missingConstantColumns
        );

        return;
      }

      /*
       * --------------------------------------------------
       * STEP H: DETECT SUBJECTS
       * --------------------------------------------------
       */

      const subjectNumbers = detectSubjects(actualColumns);

      console.log("Detected subject numbers:", subjectNumbers);

      if (subjectNumbers.length === 0) {
        setError("Invalid Excel file. No subjects were detected.");
        return;
      }

      /*
       * --------------------------------------------------
       * STEP I: VALIDATE SUBJECT COLUMNS
       * --------------------------------------------------
       */

      const missingSubjectColumns = [];

      subjectNumbers.forEach((subjectNumber) => {
        SUBJECT_FIELDS.forEach((field) => {
          const columnName = `Subject ${subjectNumber} ${field}`;

          if (!actualColumns.includes(columnName)) {
            missingSubjectColumns.push(columnName);
          }
        });
      });

      if (missingSubjectColumns.length > 0) {
        setError(
          `Invalid Excel file. Missing ${missingSubjectColumns.length} subject column(s).`
        );

        console.error(
          "Missing subject columns:",
          missingSubjectColumns
        );

        return;
      }

      /*
       * --------------------------------------------------
       * STEP J: TRANSFORM DATA
       * --------------------------------------------------
       */

      const transformedData = transformAttendanceData(
        data,
        subjectNumbers
      );

      console.log("Transformed attendance data:", transformedData);

      /*
       * --------------------------------------------------
       * STEP K: SHOW PREVIEW — WAIT FOR CONFIRMATION
       * --------------------------------------------------
       *
       * No network call yet. The user must review this
       * preview and click "Import Now" before anything
       * is written to Supabase.
       */

      setPreviewData(transformedData);
      setIsReadyToImport(true);
    } catch (err) {
      console.error("Attendance parsing error:", err);
      setError(err.message || "Unable to read the Excel file.");
    } finally {
      setIsParsing(false);
    }
  };

  /*
   * --------------------------------------------------
   * HANDLE CONFIRM IMPORT
   * --------------------------------------------------
   *
   * STEP 2 of 2: only runs when the user explicitly
   * clicks "Import Now" after reviewing the preview.
   */
  const handleConfirmImport = async () => {
    if (!previewData.length) {
      return;
    }

    setIsImporting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/attendance/import`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            academicYear,
            students: previewData,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Attendance import failed."
        );
      }

      setSuccess(
        `Import successful! ${result.summary.attendanceCreated} attendance records created and ${result.summary.attendanceUpdated} updated.`
      );

      // Lock the preview so a stray double-click of
      // "Import Now" can't re-submit the same data.
      setIsReadyToImport(false);

      console.log("Import result:", result);
    } catch (err) {
      console.error("Attendance import error:", err);
      setError(err.message || "Unable to import attendance data.");
    } finally {
      setIsImporting(false);
    }
  };

  /*
   * --------------------------------------------------
   * HANDLE CANCEL
   * --------------------------------------------------
   *
   * Discards the parsed preview without importing.
   */
  const handleCancel = () => {
    setFileName("");
    resetImportState();
  };

  return (
    <div className="import-attendance-page">
      {/* ------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------- */}

      <div className="page-header">
        <div>
          <h1>Import Attendance</h1>

          <p>
            Upload an Excel file to import student attendance
            records.
          </p>
        </div>
      </div>

      {/* ------------------------------------------- */}
      {/* IMPORT CARD */}
      {/* ------------------------------------------- */}

      <div className="import-card">
        <div className="import-icon">
          <FileSpreadsheet size={32} />
        </div>

        <h2>Upload Attendance Excel</h2>

        <p>Select an Excel file containing the attendance data.</p>

        {/* ------------------------------------------- */}
        {/* ACADEMIC YEAR */}
        {/* ------------------------------------------- */}

        <div className="academic-year-field">
          <label htmlFor="academic-year">Academic Year</label>

          <select
            id="academic-year"
            value={academicYear}
            disabled={isReadyToImport}
            onChange={(event) =>
              setAcademicYear(event.target.value)
            }
          >
            <option value="">Select Academic Year</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
            <option value="2028-2029">2028-2029</option>
          </select>
        </div>

        {/* ------------------------------------------- */}
        {/* UPLOAD BUTTON */}
        {/* ------------------------------------------- */}

        <label className="upload-button">
          <Upload size={18} />

          <span>
            {isParsing
              ? "Reading file..."
              : fileName
              ? "Change Excel File"
              : "Select Excel File"}
          </span>

          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            disabled={isParsing || isImporting}
            onChange={handleFileChange}
          />
        </label>

        <span className="supported-format">
          Supported formats: .xlsx, .xls
        </span>

        {/* ------------------------------------------- */}
        {/* SELECTED FILE */}
        {/* ------------------------------------------- */}

        {fileName && (
          <p className="selected-file">
            Selected: <strong>{fileName}</strong>
          </p>
        )}

        {/* ------------------------------------------- */}
        {/* ERROR */}
        {/* ------------------------------------------- */}

        {error && <p className="import-error">{error}</p>}

        {/* ------------------------------------------- */}
        {/* SUCCESS */}
        {/* ------------------------------------------- */}

        {success && (
          <p className="import-success">
            <CheckCircle2 size={16} /> {success}
          </p>
        )}

        {/* ------------------------------------------- */}
        {/* CONFIRM / CANCEL — only shown once a file   */}
        {/* has been parsed and is awaiting confirmation */}
        {/* ------------------------------------------- */}

        {isReadyToImport && (
          <div className="import-confirm-actions">
            <button
              type="button"
              className="import-confirm-button"
              disabled={isImporting}
              onClick={handleConfirmImport}
            >
              {isImporting
                ? "Importing..."
                : `Import Now (${previewData.length} student${
                    previewData.length === 1 ? "" : "s"
                  })`}
            </button>

            <button
              type="button"
              className="import-cancel-button"
              disabled={isImporting}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------- */}
      {/* PREVIEW */}
      {/* ------------------------------------------- */}

      {previewData.length > 0 && (
        <div className="import-preview">
          <h2>Excel Data Preview</h2>

          <p>
            Records found: <strong>{previewData.length}</strong>
            {isReadyToImport && (
              <>
                {" "}
                — review below, then click{" "}
                <strong>Import Now</strong> to write this data.
              </>
            )}
          </p>

          <pre>
            {JSON.stringify(previewData.slice(0, 5), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ImportAttendance;