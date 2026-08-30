import { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  Database,
  CalendarDays,
} from "lucide-react";
import * as XLSX from "xlsx";
import "./ImportAttendance.css";
import StudentAttendanceCard from "../../components/StudentAttendanceCard";
import { calculateOverallAttendance } from "../../utils/attendanceUtils";

const API_URL = import.meta.env.VITE_API_URL;

// ============================================================
// CONSTANT COLUMNS
// ============================================================

const CONSTANT_COLUMNS = [
  "email",
  "Name",
  "Squad",
];

// ============================================================
// SUBJECT FIELDS
// ============================================================

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

// ============================================================
// GROWTH HOUR FIELDS
// ============================================================

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

// ============================================================
// SEMESTERS
// ============================================================

const SEMESTERS = [
  {
    value: "Sem 1",
    label: "Semester 1",
  },
  {
    value: "Sem 2",
    label: "Semester 2",
  },
  {
    value: "Sem 3",
    label: "Semester 3",
  },
];

// ============================================================
// GET ACADEMIC YEAR FROM DATE
// ============================================================

const getAcademicYearFromDate = (date) => {
  if (!date) return "";

  const selectedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(selectedDate.getTime())) {
    return "";
  }

  const year = selectedDate.getFullYear();

  // Academic year starts in August
  if (selectedDate.getMonth() >= 7) {
    return `${year}-${year + 1}`;
  }

  return `${year - 1}-${year}`;
};

// ============================================================
// DETECT SUBJECTS
// ============================================================

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

// ============================================================
// DETECT GROWTH HOUR
// ============================================================

const detectGrowthHour = (columns) => {
  return columns.some((column) =>
    column.toLowerCase().includes("growth hour")
  );
};

// ============================================================
// TRANSFORM EXCEL DATA
// ============================================================

const transformAttendanceData = (data) => {
  return data.map((row) => {
    const columns = Object.keys(row);

    const subjectNumbers =
      detectSubjects(columns);

    const subjects = [];

    let growthHour = null;

    subjectNumbers.forEach((subjectNumber) => {
      const id = row[`Subject ${subjectNumber} ID`];
      const name = row[`Subject ${subjectNumber} Name`];
      const subjectData = {
        id,
        name,
        sessionsConducted: row[`Subject ${subjectNumber} Sessions Conducted`],
        sessionsAttended: row[`Subject ${subjectNumber} Sessions Attended`],
        sessionsAbsent: row[`Subject ${subjectNumber} Sessions Absent`],
        attendancePercentage: row[`Subject ${subjectNumber} Attendance %`],
        sessionsMarkedOD: row[`Subject ${subjectNumber} Sessions Marked OD`],
        sessionsMedicalLeave:
          row[`Subject ${subjectNumber} Sessions on Approved Medical Leave (ML)`],
        sessionsAppliedLeave: row[`Subject ${subjectNumber} Sessions Applied Leave`],
      };
      console.log(
        `Subject ${subjectNumber} percentage:`,
        row[`Subject ${subjectNumber} Attendance %`],
        typeof row[`Subject ${subjectNumber} Attendance %`]
      );


        // ======================================================
        // GROWTH HOUR
        // ======================================================

        const isGrowthHour =
          (!id ||
            String(id).trim() === "") &&
          String(name || "")
            .toLowerCase()
            .includes("growth_hour");

        if (isGrowthHour) {
          growthHour = {
            name: name || "Growth Hour",

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

        // ======================================================
        // NORMAL SUBJECT
        // ======================================================

        if (id && name) {
          subjects.push(subjectData);
        }
      }
    );

    return {
      email: row.email,
      name: row.Name,
      squad: row.Squad,
      parent_name: row["Parent Name"] || row.parent_name || row.ParentName,
      parent_email: row["Parent Email"] || row.parent_email || row.ParentEmail,
      parent_phone: row["Parent Phone"] || row["Parent Phone Number"] || row["Parent's Number"] || row.parent_phone || row.ParentPhone,

      subjects,

      growthHour,
    };
  });
};

// ============================================================
// COMPONENT
// ============================================================

function ImportAttendance() {
  // ==========================================================
  // FILE
  // ==========================================================

  const [fileName, setFileName] =
    useState("");

  // ==========================================================
  // ATTENDANCE DATA
  // ==========================================================

  const [attendanceData, setAttendanceData] =
    useState([]);

  // ==========================================================
  // SEARCH / FILTER
  // ==========================================================

  const [studentSearch, setStudentSearch] =
    useState("");

  const [attendanceFilter, setAttendanceFilter] =
    useState("");

  // ==========================================================
  // FORM DATA
  // ==========================================================

  const [academicYear, setAcademicYear] =
    useState("");

  const [semester, setSemester] =
    useState("Sem 1");

  const [periodStart, setPeriodStart] =
    useState("");

  const [periodEnd, setPeriodEnd] =
    useState("");

  // ==========================================================
  // STATUS
  // ==========================================================

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isImporting, setIsImporting] =
    useState(false);

  const [importSummary, setImportSummary] =
    useState(null);

  // ==========================================================
  // FILTER STUDENTS
  // ==========================================================

  const filteredStudents =
    attendanceData.filter((student) => {
      const searchValue =
        studentSearch
          .toLowerCase()
          .trim();

      const overallAttendance =
        calculateOverallAttendance(
          student
        );

      const matchesSearch =
        !searchValue ||
        student.name
          ?.toLowerCase()
          .includes(searchValue) ||
        student.email
          ?.toLowerCase()
          .includes(searchValue) ||
        String(student.squad || "")
          .toLowerCase()
          .includes(searchValue);

      const matchesAttendance =
        !attendanceFilter ||
        (attendanceFilter ===
        "below-75"
          ? overallAttendance < 75
          : overallAttendance >= 75);

      return (
        matchesSearch &&
        matchesAttendance
      );
    });

  // ==========================================================
  // FILE CHANGE
  // ==========================================================

  const handleFileChange = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setError("");
    setSuccess("");
    setImportSummary(null);
    setAttendanceData([]);

    try {
      // ======================================================
      // READ FILE
      // ======================================================

      const arrayBuffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(
          arrayBuffer,
          {
            type: "array",
          }
        );

      if (
        !workbook.SheetNames.length
      ) {
        setError(
          "The Excel file does not contain any sheets."
        );

        return;
      }

      // ======================================================
      // FIRST SHEET
      // ======================================================

      const firstSheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[
          firstSheetName
        ];

      const data =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: "",
          }
        );

      // ======================================================
      // EMPTY FILE
      // ======================================================

      if (data.length === 0) {
        setError(
          "The Excel sheet is empty."
        );

        return;
      }

      // ======================================================
      // COLUMNS
      // ======================================================

      const actualColumns =
        Object.keys(data[0]);

      console.log(
        "Excel columns:",
        actualColumns
      );

      // ======================================================
      // VALIDATE CONSTANT COLUMNS
      // ======================================================

      const missingConstantColumns =
        CONSTANT_COLUMNS.filter(
          (column) =>
            !actualColumns.includes(
              column
            )
        );

      if (
        missingConstantColumns.length >
        0
      ) {
        setError(
          `Invalid Excel file. Missing required column(s): ${missingConstantColumns.join(
            ", "
          )}`
        );

        return;
      }

      // ======================================================
      // DETECT SUBJECTS
      // ======================================================

      const subjectNumbers =
        detectSubjects(
          actualColumns
        );

      // ======================================================
      // DETECT GROWTH HOUR
      // ======================================================

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

      // ======================================================
      // VALIDATE SUBJECT COLUMNS
      // ======================================================

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

      // ======================================================
      // VALIDATE GROWTH HOUR
      // ======================================================

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

      const missingColumns = [
        ...missingSubjectColumns,
        ...missingGrowthHourColumns,
      ];

      if (
        missingColumns.length > 0
      ) {
        setError(
          `Invalid Excel file. Missing ${missingColumns.length} required column(s).`
        );

        console.error(
          "Missing columns:",
          missingColumns
        );

        return;
      }

      // ======================================================
      // TRANSFORM DATA
      // ======================================================

      const transformedData =
        transformAttendanceData(
          data
        );

      console.log(
        "Transformed attendance data:",
        transformedData
      );

      setAttendanceData(
        transformedData
      );

      // ======================================================
      // SUCCESS
      // ======================================================

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

  // ==========================================================
  // START DATE CHANGE
  // ==========================================================

  const handlePeriodStartChange = (
    event
  ) => {
    const date =
      event.target.value;

    setPeriodStart(date);

    // Automatically determine academic year
    if (date) {
      const year =
        getAcademicYearFromDate(
          date
        );

      setAcademicYear(year);
    }

    // Clear invalid end date
    if (
      periodEnd &&
      date &&
      new Date(
        `${periodEnd}T00:00:00`
      ) <
        new Date(
          `${date}T00:00:00`
        )
    ) {
      setPeriodEnd("");
    }
  };

  // ==========================================================
  // END DATE CHANGE
  // ==========================================================

  const handlePeriodEndChange = (
    event
  ) => {
    const date =
      event.target.value;

    setPeriodEnd(date);

    // If start date is empty,
    // use end date to determine academic year.
    if (!periodStart && date) {
      const year =
        getAcademicYearFromDate(
          date
        );

      setAcademicYear(year);
    }
  };

  // ==========================================================
  // IMPORT
  // ==========================================================

  const handleImport = async () => {
    // ========================================================
    // VALIDATE FILE
    // ========================================================

    if (
      attendanceData.length === 0
    ) {
      setError(
        "Please select and validate an Excel file first."
      );

      return;
    }

    // ========================================================
    // VALIDATE SEMESTER
    // ========================================================

    if (!semester) {
      setError(
        "Please select a semester."
      );

      return;
    }

    // ========================================================
    // VALIDATE START DATE
    // ========================================================

    if (!periodStart) {
      setError(
        "Please select the attendance period start date."
      );

      return;
    }

    // ========================================================
    // VALIDATE END DATE
    // ========================================================

    if (!periodEnd) {
      setError(
        "Please select the attendance period end date."
      );

      return;
    }

    // ========================================================
    // CALCULATE ACADEMIC YEAR
    // ========================================================

    const calculatedAcademicYear =
      getAcademicYearFromDate(
        periodStart
      );

    if (!calculatedAcademicYear) {
      setError(
        "Unable to determine the academic year from the selected date."
      );

      return;
    }

    // Keep state synchronized
    setAcademicYear(
      calculatedAcademicYear
    );

    // ========================================================
    // VALIDATE DATE ORDER
    // ========================================================

    if (
      new Date(
        `${periodStart}T00:00:00`
      ) >
        new Date(
          `${periodEnd}T00:00:00`
        )
    ) {
      setError(
        "Attendance period start date cannot be after the end date."
      );

      return;
    }

    // ========================================================
    // START IMPORT
    // ========================================================

    setIsImporting(true);
    setError("");
    setSuccess("");
    setImportSummary(null);

    try {
      // ======================================================
      // PAYLOAD
      // ======================================================

      const payload = {
        academicYear:
          calculatedAcademicYear,

        semester,

        periodStart,

        periodEnd,

        students:
          attendanceData,
      };

      console.log(
        "Sending attendance data to backend..."
      );

      console.log(
        "Payload:",
        payload
      );

      // ======================================================
      // API REQUEST
      // ======================================================

      const response =
        await fetch(
          `${API_URL}/api/attendance/import`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      // ======================================================
      // RESPONSE
      // ======================================================

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          response.status === 413
            ? "The Excel import is too large. Please reduce the file size or number of columns."
            : "The backend returned an invalid response. Please try again."
        );
      }

      console.log(
        "Backend response:",
        result
      );

      // ======================================================
      // ERROR
      // ======================================================

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            result.message ||
            "Attendance import failed."
        );
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      setSuccess(
        result.message ||
          "Attendance imported successfully."
      );

      setImportSummary(
        result
      );
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

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="import-attendance-page">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

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

      {/* ================================================== */}
      {/* UPLOAD CARD */}
      {/* ================================================== */}

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

        {/* ================================================ */}
        {/* SEMESTER */}
        {/* ================================================ */}

        <div className="academic-year-field">

          <label htmlFor="semester">
            Semester
          </label>

          <select
            id="semester"
            value={semester}
            onChange={(event) =>
              setSemester(
                event.target.value
              )
            }
            disabled={isImporting}
          >
            {SEMESTERS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </select>

        </div>

        {/* ================================================ */}
        {/* ATTENDANCE PERIOD */}
        {/* ================================================ */}

        <div className="attendance-period-fields">

          {/* ---------------------------------------------- */}
          {/* START DATE */}
          {/* ---------------------------------------------- */}

          <div className="academic-year-field">

            <label htmlFor="periodStart">
              <CalendarDays
                size={16}
              />

              Attendance Period Start
            </label>

            <input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={
                handlePeriodStartChange
              }
              disabled={isImporting}
            />

          </div>

          {/* ---------------------------------------------- */}
          {/* END DATE */}
          {/* ---------------------------------------------- */}

          <div className="academic-year-field">

            <label htmlFor="periodEnd">
              <CalendarDays
                size={16}
              />

              Attendance Period End
            </label>

            <input
              id="periodEnd"
              type="date"
              value={periodEnd}
              min={
                periodStart ||
                undefined
              }
              onChange={
                handlePeriodEndChange
              }
              disabled={isImporting}
            />

          </div>

        </div>

        {/* ================================================ */}
        {/* ACADEMIC YEAR AUTO INFO */}
        {/* ================================================ */}

        {academicYear && (
          <div className="academic-year-auto">

            <span>
              Academic Year
            </span>

            <strong>
              {academicYear}
            </strong>

          </div>
        )}

        {/* ================================================ */}
        {/* PERIOD PREVIEW */}
        {/* ================================================ */}

        {(periodStart ||
          periodEnd) && (
          <div className="attendance-period-preview">

            <strong>
              Attendance Period
            </strong>

            <span>
              {periodStart ||
                "Start date"}{" "}
              →{" "}
              {periodEnd ||
                "End date"}
            </span>

          </div>
        )}

        {/* ================================================ */}
        {/* FILE UPLOAD */}
        {/* ================================================ */}

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
            disabled={isImporting}
          />

        </label>

        {/* ================================================ */}
        {/* SUPPORTED FORMAT */}
        {/* ================================================ */}

        <span className="supported-format">
          Supported formats: .xlsx, .xls
        </span>

        {/* ================================================ */}
        {/* SELECTED FILE */}
        {/* ================================================ */}

        {fileName && (
          <p className="selected-file">
            Selected:{" "}
            <strong>
              {fileName}
            </strong>
          </p>
        )}

        {/* ================================================ */}
        {/* IMPORT META */}
        {/* ================================================ */}

        {fileName &&
          semester &&
          periodStart &&
          periodEnd && (
          <div className="import-meta-preview">

            <div>
              <span>
                Academic Year
              </span>

              <strong>
                {academicYear}
              </strong>
            </div>

            <div>
              <span>
                Semester
              </span>

              <strong>
                {semester}
              </strong>
            </div>

            <div>
              <span>
                Period
              </span>

              <strong>
                {periodStart} →{" "}
                {periodEnd}
              </strong>
            </div>

          </div>
        )}

        {/* ================================================ */}
        {/* ERROR */}
        {/* ================================================ */}

        {error && (
          <p className="import-error">
            {error}
          </p>
        )}

        {/* ================================================ */}
        {/* SUCCESS */}
        {/* ================================================ */}

        {success && (
          <p className="import-success">
            {success}
          </p>
        )}

        {/* ================================================ */}
        {/* IMPORT BUTTON */}
        {/* ================================================ */}

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

      {/* ================================================== */}
      {/* IMPORT SUMMARY */}
      {/* ================================================== */}

      {importSummary && (
        <div className="import-summary">

          <h2>
            Import Summary
          </h2>

          <div className="summary-period">

            <div>
              <span>
                Academic Year
              </span>

              <strong>
                {
                  importSummary.academicYear ??
                  academicYear
                }
              </strong>
            </div>

            <div>
              <span>
                Semester
              </span>

              <strong>
                {
                  importSummary.semester ??
                  semester
                }
              </strong>
            </div>

            <div>
              <span>
                Attendance Period
              </span>

              <strong>
                {
                  importSummary.periodStart ??
                  periodStart
                }{" "}
                →{" "}
                {
                  importSummary.periodEnd ??
                  periodEnd
                }
              </strong>
            </div>

          </div>

          <div className="summary-grid">

            <div className="summary-item">
              <span>
                Students Created
              </span>

              <strong>
                {
                  importSummary.studentsCreated ??
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
                  importSummary.studentsUpdated ??
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
                  importSummary.subjectsCreated ??
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
                  importSummary.subjectsFound ??
                  0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Attendance Created
              </span>

              <strong>
                {
                  importSummary.attendanceCreated ??
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
                  importSummary.attendanceUpdated ??
                  0
                }
              </strong>
            </div>

            <div className="summary-item">
              <span>
                Growth Hour Created
              </span>

              <strong>
                {
                  importSummary.growthHourCreated ??
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
                  importSummary.growthHourUpdated ??
                  0
                }
              </strong>
            </div>

          </div>

        </div>
      )}

      {/* ================================================== */}
      {/* EXCEL DATA PREVIEW */}
      {/* ================================================== */}

      {attendanceData.length >
        0 && (
        <div className="import-preview">

          <div className="preview-header">

            <div>
              <h2>
                Excel Data Preview
              </h2>

              <p>
                <strong>
                  {
                    attendanceData.length
                  }
                </strong>{" "}
                Students
              </p>
            </div>

          </div>

          {/* ============================================== */}
          {/* SEARCH / FILTER */}
          {/* ============================================== */}

          <div className="student-search">

            <input
              type="text"
              placeholder="Search student..."
              value={
                studentSearch
              }
              onChange={(event) =>
                setStudentSearch(
                  event.target.value
                )
              }
            />

            <select
              value={
                attendanceFilter
              }
              onChange={(event) =>
                setAttendanceFilter(
                  event.target.value
                )
              }
              aria-label="Filter by attendance percentage"
            >

              <option value="">
                All Attendance
              </option>

              <option value="below-75">
                Below 75%
              </option>

              <option value="above-75">
                75% and above
              </option>

            </select>

          </div>

          {/* ============================================== */}
          {/* STUDENT LIST */}
          {/* ============================================== */}

          <div className="student-list">

            {filteredStudents.map(
              (student) => (
                <StudentAttendanceCard
                  key={
                    student.email
                  }
                  student={student}
                />
              )
            )}

            {filteredStudents.length ===
              0 && (
              <div className="empty-search">

                <h3>
                  No students found
                </h3>

                <p>
                  Try searching with a
                  different name, email,
                  or squad.
                </p>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default ImportAttendance;