import { useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import "./ImportAttendance.css";

/*
 * These columns are present for every student.
 */
const CONSTANT_COLUMNS = [
  "email",
  "Name",
  "Squad",
];

/*
 * Every subject must contain these fields.
 * The number of subjects can change every year.
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
 * Detect subject numbers from Excel column names.
 *
 * Example:
 * Subject 1 Name
 * Subject 1 ID
 * Subject 2 Name
 * Subject 2 ID
 *
 * Returns:
 * [1, 2]
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
 * Convert the raw Excel data into a cleaner structure.
 *
 * Excel:
 *
 * email
 * Name
 * Squad
 * Subject 1 Name
 * Subject 1 ID
 * ...
 * Subject N ...
 *
 * Becomes:
 *
 * {
 *   email,
 *   name,
 *   squad,
 *   subjects: [...]
 * }
 */
const transformAttendanceData = (data) => {
  return data.map((row) => {
    const subjectNumbers = detectSubjects(Object.keys(row));

    const subjects = subjectNumbers.map((subjectNumber) => ({
      name: row[`Subject ${subjectNumber} Name`],
      id: row[`Subject ${subjectNumber} ID`],

      sessionsConducted:
        row[`Subject ${subjectNumber} Sessions Conducted`],

      sessionsAttended:
        row[`Subject ${subjectNumber} Sessions Attended`],

      sessionsAbsent:
        row[`Subject ${subjectNumber} Sessions Absent`],

      attendancePercentage:
        row[`Subject ${subjectNumber} Attendance %`],

      sessionsMarkedOD:
        row[`Subject ${subjectNumber} Sessions Marked OD`],

      sessionsMedicalLeave:
        row[
          `Subject ${subjectNumber} Sessions on Approved Medical Leave (ML)`
        ],

      sessionsAppliedLeave:
        row[`Subject ${subjectNumber} Sessions Applied Leave`],
    }));

    return {
      email: row.email,
      name: row.Name,
      squad: row.Squad,
      subjects,
    };
  });
};

function ImportAttendance() {
  const [fileName, setFileName] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setError("");
    setSuccess("");
    setAttendanceData([]);

    try {
      /*
       * Read the uploaded Excel file.
       */
      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
      });

      /*
       * Make sure the workbook contains at least one sheet.
       */
      if (!workbook.SheetNames.length) {
        setError("The Excel file does not contain any sheets.");
        return;
      }

      /*
       * Use the first worksheet.
       */
      const firstSheetName = workbook.SheetNames[0];

      const worksheet = workbook.Sheets[firstSheetName];

      /*
       * Convert Excel rows into JavaScript objects.
       */
      const data = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      /*
       * Check whether the sheet contains data.
       */
      if (data.length === 0) {
        setError("The Excel sheet is empty.");
        return;
      }

      /*
       * Get all Excel column names.
       */
      const actualColumns = Object.keys(data[0]);

      console.log("Excel columns:", actualColumns);

      /*
       * --------------------------------------------------
       * STEP 1: Validate constant columns
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
       * STEP 2: Detect subjects dynamically
       * --------------------------------------------------
       */

      const subjectNumbers = detectSubjects(actualColumns);

      console.log("Detected subject numbers:", subjectNumbers);

      if (subjectNumbers.length === 0) {
        setError(
          "Invalid Excel file. No subjects were detected."
        );

        return;
      }

      /*
       * --------------------------------------------------
       * STEP 3: Validate every detected subject
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
       * STEP 4: Transform the Excel data
       * --------------------------------------------------
       */

      const transformedData = transformAttendanceData(data);

      console.log(
        "Transformed attendance data:",
        transformedData
      );

      /*
       * --------------------------------------------------
       * STEP 5: Success
       * --------------------------------------------------
       */

      setSuccess(
        `Excel file validated successfully. ${data.length} students and ${subjectNumbers.length} subjects detected.`
      );

      setAttendanceData(transformedData);
    } catch (err) {
      console.error("Excel parsing error:", err);

      setError(
        "Unable to read the Excel file. Please check the file format."
      );
    }
  };

  return (
    <div className="import-attendance-page">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Import Attendance</h1>

          <p>
            Upload an Excel file to import student attendance records.
          </p>
        </div>
      </div>

      {/* Upload Card */}
      <div className="import-card">

        <div className="import-icon">
          <FileSpreadsheet size={32} />
        </div>

        <h2>Upload Attendance Excel</h2>

        <p>
          Select an Excel file containing the attendance data.
        </p>

        <label className="upload-button">

          <Upload size={18} />

          <span>
            {fileName
              ? "Change Excel File"
              : "Select Excel File"}
          </span>

          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleFileChange}
          />

        </label>

        <span className="supported-format">
          Supported formats: .xlsx, .xls
        </span>

        {/* Selected File */}
        {fileName && (
          <p className="selected-file">
            Selected: <strong>{fileName}</strong>
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p className="import-error">
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && (
          <p className="import-success">
            {success}
          </p>
        )}

      </div>

      {/* Preview */}
      {attendanceData.length > 0 && (
        <div className="import-preview">

          <h2>Excel Data Preview</h2>

          <p>
            Records found:{" "}
            <strong>{attendanceData.length}</strong>
          </p>

          <pre>
            {JSON.stringify(
              attendanceData.slice(0, 5),
              null,
              2
            )}
          </pre>

        </div>
      )}

    </div>
  );
}

export default ImportAttendance;