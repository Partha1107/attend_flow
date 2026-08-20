import { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  Database,
} from "lucide-react";
import * as XLSX from "xlsx";
import "./ImportAttendance.css";
import StudentAttendanceCard from "../../components/StudentAttendanceCard";

const API_URL = "http://localhost:5000";

const CONSTANT_COLUMNS = [
  "email",
  "Name",
  "Squad",
];

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

const GROWTH_HOUR_FIELDS = [
  "Name",
  "Sessions Conducted",
  "Sessions Attended",
  "Sessions Absent",
  "Attendance %",
  "Sessions Marked OD",
  "Sessions on Approved Medical Leave (ML)",
  "Sessions Applied Leave",
];

// ---------------------------------------
// Detect normal Subject N columns
// ---------------------------------------

const detectSubjects = (columns) => {
  const subjectNumbers = new Set();

  columns.forEach((column) => {
    const match = column.match(/^Subject (\d+) /);

    if (match) {
      subjectNumbers.add(Number(match[1]));
    }
  });

  return [...subjectNumbers].sort(
    (a, b) => a - b
  );
};

// ---------------------------------------
// Detect Growth Hour columns
// ---------------------------------------

const detectGrowthHour = (columns) => {
  return columns.some(
    (column) =>
      column.includes("Growth Hour")
  );
};

// ---------------------------------------
// Transform Excel data
// ---------------------------------------
const transformAttendanceData = (data) => {
  return data.map((row) => {
    const columns = Object.keys(row);

    const subjectNumbers = detectSubjects(columns);

    const subjects = [];
    let growthHour = null;

    subjectNumbers.forEach((subjectNumber) => {
      const id =
        row[`Subject ${subjectNumber} ID`];

      const name =
        row[`Subject ${subjectNumber} Name`];

      const subjectData = {
        id,
        name,
        sessionsConducted:
          row[
            `Subject ${subjectNumber} Sessions Conducted`
          ],
        sessionsAttended:
          row[
            `Subject ${subjectNumber} Sessions Attended`
          ],
        sessionsAbsent:
          row[
            `Subject ${subjectNumber} Sessions Absent`
          ],
        attendancePercentage:
          row[
            `Subject ${subjectNumber} Attendance %`
          ],
        sessionsMarkedOD:
          row[
            `Subject ${subjectNumber} Sessions Marked OD`
          ],
        sessionsMedicalLeave:
          row[
            `Subject ${subjectNumber} Sessions on Approved Medical Leave (ML)`
          ],
        sessionsAppliedLeave:
          row[
            `Subject ${subjectNumber} Sessions Applied Leave`
          ],
      };

      // ---------------------------------------
      // Detect Growth Hour
      // ---------------------------------------

      const isGrowthHour =
        (!id ||
          String(id).trim() === "") &&
        String(name || "")
          .toLowerCase()
          .includes("growth_hour");

      if (isGrowthHour) {
        growthHour = {
          name:
            name || "Growth Hour",

          sessionsConducted:
            subjectData.sessionsConducted,

          sessionsAttended:
            subjectData.sessionsAttended,

          sessionsAbsent:
            subjectData.sessionsAbsent,

          attendancePercentage:
            subjectData.attendancePercentage,

          sessionsMarkedOD:
            subjectData.sessionsMarkedOD,

          sessionsMedicalLeave:
            subjectData.sessionsMedicalLeave,

          sessionsAppliedLeave:
            subjectData.sessionsAppliedLeave,
        };

        return;
      }

      // ---------------------------------------
      // Normal Subject
      // ---------------------------------------

      if (id && name) {
        subjects.push(subjectData);
      }
    });

    return {
      email: row.email,
      name: row.Name,
      squad: row.Squad,
      subjects,
      growthHour,
    };
  });
};

// ---------------------------------------
// Component
// ---------------------------------------

function ImportAttendance() {
  const [fileName, setFileName] =
    useState("");

  const [attendanceData, setAttendanceData] =
    useState([]);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [academicYear, setAcademicYear] =
    useState("2026-2027");

  const [isImporting, setIsImporting] =
    useState(false);

  const [importSummary, setImportSummary] =
    useState(null);

  // ---------------------------------------
  // Select Excel
  // ---------------------------------------

  const handleFileChange = async (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setError("");
    setSuccess("");
    setImportSummary(null);
    setAttendanceData([]);

    try {
      const arrayBuffer =
        await file.arrayBuffer();

      const workbook = XLSX.read(
        arrayBuffer,
        {
          type: "array",
        }
      );

      if (!workbook.SheetNames.length) {
        setError(
          "The Excel file does not contain any sheets."
        );
        return;
      }

      const firstSheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[firstSheetName];

      const data =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: "",
          }
        );

      if (data.length === 0) {
        setError(
          "The Excel sheet is empty."
        );
        return;
      }

      const actualColumns =
        Object.keys(data[0]);

      console.log(
        "Excel columns:",
        actualColumns
      );

      // ---------------------------------------
      // Validate constant columns
      // ---------------------------------------

      const missingConstantColumns =
        CONSTANT_COLUMNS.filter(
          (column) =>
            !actualColumns.includes(column)
        );

      if (
        missingConstantColumns.length > 0
      ) {
        setError(
          `Invalid Excel file. Missing required column(s): ${missingConstantColumns.join(
            ", "
          )}`
        );

        return;
      }

      // ---------------------------------------
      // Detect normal subjects
      // ---------------------------------------

      const subjectNumbers =
        detectSubjects(
          actualColumns
        );

      // ---------------------------------------
      // Detect Growth Hour
      // ---------------------------------------

      const hasGrowthHour =
        detectGrowthHour(
          actualColumns
        );

      if (
        subjectNumbers.length === 0 &&
        !hasGrowthHour
      ) {
        setError(
          "Invalid Excel file. No subjects or Growth Hour were detected."
        );

        return;
      }

      console.log(
        "Detected subjects:",
        subjectNumbers
      );

      console.log(
        "Growth Hour detected:",
        hasGrowthHour
      );

      // ---------------------------------------
      // Validate normal subjects
      // ---------------------------------------

      const missingSubjectColumns =
        [];

      subjectNumbers.forEach(
        (subjectNumber) => {
          SUBJECT_FIELDS.forEach(
            (field) => {
              const columnName =
                `Subject ${subjectNumber} ${field}`;

              if (
                !actualColumns.includes(
                  columnName
                )
              ) {
                missingSubjectColumns.push(
                  columnName
                );
              }
            }
          );
        }
      );

      // ---------------------------------------
      // Validate Growth Hour
      // ---------------------------------------

      const missingGrowthHourColumns =
        [];

      if (hasGrowthHour) {
        GROWTH_HOUR_FIELDS.forEach(
          (field) => {
            const columnName =
              `Growth Hour ${field}`;

            if (
              !actualColumns.includes(
                columnName
              )
            ) {
              missingGrowthHourColumns.push(
                columnName
              );
            }
          }
        );
      }

      // ---------------------------------------
      // Combined validation
      // ---------------------------------------

      const missingColumns = [
        ...missingSubjectColumns,
        ...missingGrowthHourColumns,
      ];

      if (missingColumns.length > 0) {
        setError(
          `Invalid Excel file. Missing ${missingColumns.length} required column(s).`
        );

        console.error(
          "Missing columns:",
          missingColumns
        );

        return;
      }

      // ---------------------------------------
      // Transform
      // ---------------------------------------

      const transformedData =
        transformAttendanceData(data);

      console.log(
        "Transformed attendance data:",
        transformedData
      );

      console.log(
        "FIRST STUDENT:",
        JSON.stringify(transformedData[0], null, 2)
      );

      setAttendanceData(
        transformedData
      );

      const detectedCount =
        subjectNumbers.length +
        (hasGrowthHour ? 1 : 0);

      setSuccess(
        `Excel validated successfully. ${data.length} students and ${detectedCount} attendance categories detected.`
      );
    } catch (err) {
      console.error(
        "Excel parsing error:",
        err
      );

      setError(
        "Unable to read the Excel file. Please check the file format."
      );
    }
  };

  // ---------------------------------------
  // Import to backend
  // ---------------------------------------

  const handleImport = async () => {
    if (
      attendanceData.length === 0
    ) {
      setError(
        "Please select and validate an Excel file first."
      );

      return;
    }

    if (!academicYear) {
      setError(
        "Please enter the academic year."
      );

      return;
    }

    setIsImporting(true);
    setError("");
    setSuccess("");
    setImportSummary(null);

    try {
      console.log(
        "Sending attendance data to backend..."
      );

      console.log(
        "Payload:",
        {
          academicYear,
          students: attendanceData,
        }
      );

      const response =
        await fetch(
          `${API_URL}/api/attendance/import`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              academicYear,
              students:
                attendanceData,
            }),
          }
        );

      const result =
        await response.json();

      console.log(
        "Backend response:",
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
          "Attendance import failed."
        );
      }

      setSuccess(
        result.message ||
        "Attendance imported successfully."
      );

      setImportSummary(result);

    } catch (err) {
      console.error(
        "Import error:",
        err
      );

      if (
        err instanceof TypeError
      ) {
        setError(
          "Cannot connect to the AESA backend. Make sure the server is running on port 5000."
        );
      } else {
        setError(
          err.message ||
          "Failed to import attendance."
        );
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="import-attendance-page">

      {/* Header */}

      <div className="page-header">
        <div>
          <h1>
            Import Attendance
          </h1>

          <p>
            Upload an Excel file to
            import student attendance
            records.
          </p>
        </div>
      </div>

      {/* Upload Card */}

      <div className="import-card">

        <div className="import-icon">
          <FileSpreadsheet
            size={32}
          />
        </div>

        <h2>
          Upload Attendance Excel
        </h2>

        <p>
          Select an Excel file
          containing the attendance
          data.
        </p>

        {/* Academic Year */}

        <div className="academic-year-field">

          <label htmlFor="academicYear">
            Academic Year
          </label>

          <input
            id="academicYear"
            type="text"
            value={academicYear}
            onChange={(event) =>
              setAcademicYear(
                event.target.value
              )
            }
            placeholder="2026-2027"
            disabled={
              isImporting
            }
          />

        </div>

        {/* Upload */}

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
            onChange={
              handleFileChange
            }
            disabled={
              isImporting
            }
          />

        </label>

        <span className="supported-format">
          Supported formats: .xlsx, .xls
        </span>

        {/* Selected File */}

        {fileName && (
          <p className="selected-file">
            Selected:{" "}
            <strong>
              {fileName}
            </strong>
          </p>
        )}

        {/* Error */}

        {error && (
          <p className="import-error">
            {error}
          </p>
        )}

        {/* Success */}

        {success && (
          <p className="import-success">
            {success}
          </p>
        )}

        {/* Import Button */}

        {attendanceData.length >
          0 && (
            <button
              type="button"
              className="import-submit-button"
              onClick={
                handleImport
              }
              disabled={
                isImporting
              }
            >

              <Database
                size={18}
              />

              {isImporting
                ? "Importing..."
                : "Import Attendance"}

            </button>
          )}

      </div>

      {/* Import Summary */}

      {importSummary && (
        <div className="import-summary">

          <h2>
            Import Summary
          </h2>

          <div className="summary-grid">

            <div className="summary-item">
              <span>
                Students Created
              </span>

              <strong>
                {
                  importSummary
                    .studentsCreated ??
                  0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Students Updated
              </span>

              <strong>
                {
                  importSummary
                    .studentsUpdated ??
                  0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Subjects Created
              </span>

              <strong>
                {
                  importSummary
                    .subjectsCreated ??
                  0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Existing Subjects
              </span>

              <strong>
                {
                  importSummary.subjectsFound ?? 0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Attendance Created
              </span>

              <strong>
                {
                  importSummary
                    .attendanceCreated ??
                  0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Attendance Updated
              </span>

              <strong>
                {
                  importSummary
                    .attendanceUpdated ??
                  0
                }
              </strong>
            </div>

            {/* Growth Hour */}

            <div className="summary-item">
              <span>
                Growth Hour Created
              </span>

              <strong>
                {
                  importSummary
                    .growthHourCreated ??
                  0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Growth Hour Updated
              </span>

              <strong>
                {
                  importSummary
                    .growthHourUpdated ??
                  0
                }
              </strong>
            </div>

            {/* Skipped */}

            <div className="summary-item">
              <span>
                Skipped Students
              </span>

              <strong>
                {
                  importSummary
                    .skippedStudents ??
                  0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Skipped Subjects
              </span>

              <strong>
                {
                  importSummary
                    .skippedSubjects ??
                  0
                }
              </strong>
            </div>

          </div>

        </div>
      )}

      {/* Preview */}

      {/* Excel Data Preview */}

      {attendanceData.length > 0 && (
        <div className="import-preview">

          <div className="preview-header">
            <div>
              <h2>
                Excel Data Preview
              </h2>

              <p>
                <strong>
                  {attendanceData.length}
                </strong>{" "}
                Students
              </p>
            </div>
          </div>

          <div className="student-search">
            <input
              type="text"
              placeholder="Search student..."
            />
          </div>

          <div className="student-list">

            {attendanceData.map(
              (student) => (
                <StudentAttendanceCard
                  key={student.email}
                  student={student}
                />
              )
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default ImportAttendance;