import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  Upload,
  Database,
} from "lucide-react";
import * as XLSX from "xlsx";
import "./ImportAttendance.css";
import StudentAttendanceCard from "../../components/StudentAttendanceCard";
import { calculateOverallAttendance } from "../../utils/attendanceUtils";

const API_URL = import.meta.env.VITE_API_URL;
const IMPORT_DRAFT_KEY = "aesa_attendance_import_draft";
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
// EXTRACT ATTENDANCE PERIOD FROM FILE NAME
// ============================================================

const extractAttendancePeriodFromFileName = (
  fileName
) => {
  if (!fileName) {
    return null;
  }

  const match = fileName.match(
    /_(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})\.(xlsx|xls)$/i
  );

  if (!match) {
    return null;
  }

  const [
    ,
    periodStart,
    periodEnd,
  ] = match;

  return {
    periodStart,
    periodEnd,
  };
};

// ============================================================
// DETECT SUBJECTS
// ============================================================

const detectSubjects = (
  columns
) => {
  const subjectNumbers = new Set();

  columns.forEach((column) => {
    const match = column.match(
      /^Subject (\d+) /
    );

    if (match) {
      subjectNumbers.add(
        Number(match[1])
      );
    }
  });

  return [...subjectNumbers].sort(
    (a, b) => a - b
  );
};

// ============================================================
// DETECT GROWTH HOUR
// ============================================================

const detectGrowthHour = (
  columns
) => {
  return columns.some((column) =>
    column
      .toLowerCase()
      .includes("growth hour")
  );
};

// ============================================================
// TRANSFORM EXCEL DATA
// ============================================================

const transformAttendanceData = (
  data
) => {
  return data.map((row) => {
    const columns =
      Object.keys(row);

    const subjectNumbers =
      detectSubjects(columns);

    const subjects = [];

    let growthHour = null;

    // ========================================================
    // PROCESS SUBJECTS
    // ========================================================

    subjectNumbers.forEach(
      (subjectNumber) => {
        const id =
          row[
            `Subject ${subjectNumber} ID`
          ];

        const name =
          row[
            `Subject ${subjectNumber} Name`
          ];

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

        // ====================================================
        // GROWTH HOUR
        // ====================================================

        const isGrowthHour =
          (!id ||
            String(id).trim() === "") &&
          String(name || "")
            .toLowerCase()
            .includes("growth_hour");

        if (isGrowthHour) {
          growthHour = {
            name:
              name ||
              "Growth Hour",

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

        // ====================================================
        // NORMAL SUBJECT
        // ====================================================

        if (id && name) {
          subjects.push(
            subjectData
          );
        }
      }
    );

    // ========================================================
    // RETURN STUDENT
    // ========================================================

    return {
      email:
        row.email,

      name:
        row.Name,

      squad:
        row.Squad,

      parent_name:
        row["Parent Name"] ||
        row.parent_name ||
        row.ParentName,

      parent_email:
        row["Parent Email"] ||
        row.parent_email ||
        row.ParentEmail,

      parent_phone:
        row["Parent Phone"] ||
        row["Parent Phone Number"] ||
        row["Parent's Number"] ||
        row.parent_phone ||
        row.ParentPhone,

      subjects,

      growthHour,
    };
  });
};

// ============================================================
// COMPONENT
// ============================================================

function ImportAttendance() {
  const navigate =
    useNavigate();

  // ==========================================================
  // RESTORATION FLAG
  // ==========================================================

  const hasRestoredRef =
    useRef(false);

  // ==========================================================
  // FILE
  // ==========================================================

  const [fileName, setFileName] =
    useState("");

  // ==========================================================
  // ATTENDANCE DATA
  // ==========================================================

  const [
    attendanceData,
    setAttendanceData,
  ] = useState([]);

  // ==========================================================
  // SEARCH / FILTER
  // ==========================================================

  const [
    studentSearch,
    setStudentSearch,
  ] = useState("");

  const [
    attendanceFilter,
    setAttendanceFilter,
  ] = useState("");

  // ==========================================================
  // FORM DATA
  // ==========================================================

  const [
    semester,
    setSemester,
  ] = useState("Sem 1");

  // ==========================================================
  // AUTOMATIC ATTENDANCE PERIOD
  // ==========================================================

  const [
    periodStart,
    setPeriodStart,
  ] = useState("");

  const [
    periodEnd,
    setPeriodEnd,
  ] = useState("");

  // ==========================================================
  // STATUS
  // ==========================================================

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    isImporting,
    setIsImporting,
  ] = useState(false);

  // ==========================================================
  // RESTORE DRAFT FROM LOCALSTORAGE
  // ==========================================================

  useEffect(() => {
    if (
      hasRestoredRef.current
    ) {
      return;
    }

    try {
      const savedDraft =
        localStorage.getItem(
          IMPORT_DRAFT_KEY
        );

      if (!savedDraft) {
        return;
      }

      const draft =
        JSON.parse(
          savedDraft
        );

      if (
        !draft ||
        !Array.isArray(
          draft.attendanceData
        ) ||
        draft.attendanceData.length ===
          0
      ) {
        return;
      }

      hasRestoredRef.current =
        true;

      Promise.resolve().then(
        () => {
          setFileName(
            draft.fileName || ""
          );

          setSemester(
            draft.semester ||
            "Sem 1"
          );

          setPeriodStart(
            draft.periodStart ||
            ""
          );

          setPeriodEnd(
            draft.periodEnd || ""
          );

          setAttendanceData(
            draft.attendanceData ||
            []
          );

          if (draft.success) {
            setSuccess(
              draft.success
            );
          }

          console.log(
            "AESA: Previous attendance import restored."
          );
        }
      );
    } catch (err) {
      console.error(
        "Failed to restore attendance import:",
        err
      );

      localStorage.removeItem(
        IMPORT_DRAFT_KEY
      );
    }
  }, []);

  // ==========================================================
  // FILTER STUDENTS
  // ==========================================================

  const filteredStudents =
    attendanceData.filter(
      (student) => {
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
            .includes(
              searchValue
            ) ||
          student.email
            ?.toLowerCase()
            .includes(
              searchValue
            ) ||
          String(
            student.squad || ""
          )
            .toLowerCase()
            .includes(
              searchValue
            );

        const matchesAttendance =
          !attendanceFilter ||
          (attendanceFilter ===
          "below-75"
            ? overallAttendance < 75
            : overallAttendance >=
              75);

        return (
          matchesSearch &&
          matchesAttendance
        );
      }
    );

  // ==========================================================
  // FILE CHANGE
  // ==========================================================

  const handleFileChange =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      // ======================================================
      // RESET OLD DATA
      // ======================================================

      setFileName(
        file.name
      );

      setError("");

      setSuccess("");

      setAttendanceData([]);

      localStorage.removeItem(
        IMPORT_DRAFT_KEY
      );

      // ======================================================
      // EXTRACT PERIOD FROM FILE NAME
      // ======================================================

      const attendancePeriod =
        extractAttendancePeriodFromFileName(
          file.name
        );

      if (!attendancePeriod) {
        setPeriodStart("");
        setPeriodEnd("");

        setError(
          "Invalid Excel filename. Expected format: attendance_report_squad_138_2026-07-23_to_2026-08-19.xlsx"
        );

        return;
      }

      const {
        periodStart:
          extractedPeriodStart,
        periodEnd:
          extractedPeriodEnd,
      } = attendancePeriod;

      setPeriodStart(
        extractedPeriodStart
      );

      setPeriodEnd(
        extractedPeriodEnd
      );

      // ======================================================
      // VALIDATE DATE ORDER
      // ======================================================

      const startDate =
        new Date(
          `${extractedPeriodStart}T00:00:00`
        );

      const endDate =
        new Date(
          `${extractedPeriodEnd}T00:00:00`
        );

      if (
        Number.isNaN(
          startDate.getTime()
        ) ||
        Number.isNaN(
          endDate.getTime()
        )
      ) {
        setError(
          "The attendance dates in the filename are invalid."
        );

        return;
      }

      if (
        startDate > endDate
      ) {
        setError(
          "Attendance period start date cannot be after the end date."
        );

        return;
      }

      // ======================================================
      // READ EXCEL FILE
      // ======================================================

      try {
        const arrayBuffer =
          await file.arrayBuffer();

        const workbook =
          XLSX.read(
            arrayBuffer,
            {
              type: "array",
            }
          );

        // ====================================================
        // CHECK SHEETS
        // ====================================================

        if (
          !workbook.SheetNames.length
        ) {
          setError(
            "The Excel file does not contain any sheets."
          );

          return;
        }

        // ====================================================
        // FIRST SHEET
        // ====================================================

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

        // ====================================================
        // EMPTY FILE
        // ====================================================

        if (
          data.length === 0
        ) {
          setError(
            "The Excel sheet is empty."
          );

          return;
        }

        // ====================================================
        // COLUMNS
        // ====================================================

        const actualColumns =
          Object.keys(
            data[0]
          );

        console.log(
          "Excel columns:",
          actualColumns
        );

        // ====================================================
        // VALIDATE CONSTANT COLUMNS
        // ====================================================

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

        // ====================================================
        // DETECT SUBJECTS
        // ====================================================

        const subjectNumbers =
          detectSubjects(
            actualColumns
          );

        // ====================================================
        // DETECT GROWTH HOUR
        // ====================================================

        const hasGrowthHour =
          detectGrowthHour(
            actualColumns
          );

        if (
          subjectNumbers.length ===
            0 &&
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

        // ====================================================
        // VALIDATE SUBJECT COLUMNS
        // ====================================================

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

        // ====================================================
        // VALIDATE GROWTH HOUR
        // ====================================================

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

        // ====================================================
        // ALL MISSING COLUMNS
        // ====================================================

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

        // ====================================================
        // TRANSFORM DATA
        // ====================================================

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

        // ====================================================
        // SAVE IMPORT DRAFT
        // ====================================================

        const detectedCount =
          subjectNumbers.length +
          (hasGrowthHour ? 1 : 0);

        const validationMessage =
          `Excel validated successfully. ${data.length} students and ${detectedCount} attendance categories detected.`;

        const draft = {
          fileName: file.name,
          semester,
          periodStart:
            extractedPeriodStart,
          periodEnd:
            extractedPeriodEnd,
          attendanceData:
            transformedData,
          success:
            validationMessage,
          savedAt:
            new Date().toISOString(),
        };

        localStorage.setItem(
          IMPORT_DRAFT_KEY,
          JSON.stringify(draft)
        );

        // ====================================================
        // SUCCESS
        // ====================================================

        setSuccess(
          validationMessage
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
  // IMPORT
  // ==========================================================

  const handleImport =
    async () => {
      // ========================================================
      // VALIDATE FILE DATA
      // ========================================================

      if (
        attendanceData.length ===
        0
      ) {
        setError(
          "Please select and validate an Excel file first."
        );

        return;
      }

      // ========================================================
      // VALIDATE FILE NAME
      // ========================================================

      if (!fileName) {
        setError(
          "Please select an Excel file."
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
      // VALIDATE EXTRACTED PERIOD
      // ========================================================

      if (
        !periodStart ||
        !periodEnd
      ) {
        setError(
          "Attendance period could not be extracted from the filename."
        );

        return;
      }

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

      try {
        // ======================================================
        // PAYLOAD
        // ======================================================

        const payload = {
          fileName,

          semester,

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

        const responseText =
          await response.text();

        let result;

        try {
          result =
            JSON.parse(
              responseText
            );
        } catch {
          throw new Error(
            response.status ===
              413
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

        // ======================================================
        // SAVE LAST IMPORT
        // ======================================================

        const importDetails = {
          fileName,

          importedAt:
            new Date().toISOString(),

          ...result,
        };

        localStorage.setItem(
          "lastAttendanceImport",
          JSON.stringify(
            importDetails
          )
        );

        // ====================================================
        // UPDATE DRAFT WITH IMPORT SUMMARY
        // ====================================================

        localStorage.setItem(
          IMPORT_DRAFT_KEY,
          JSON.stringify({
            fileName,
            semester,
            periodStart,
            periodEnd,
            attendanceData,
            success:
              result.message ||
              "Attendance imported successfully.",
            imported: true,
            importedAt:
              new Date().toISOString(),
          })
        );

        window.dispatchEvent(
          new CustomEvent(
            "attendanceImportCompleted",
            {
              detail:
                importDetails,
            }
          )
        );

        sessionStorage.setItem(
          "refresh-students",
          String(
            Date.now()
          )
        );

        // ======================================================
        // GO TO STUDENTS
        // ======================================================

        navigate(
          "/students"
        );
      } catch (err) {
        console.error(
          "Import error:",
          err
        );

        if (
          err instanceof
          TypeError
        ) {
          setError(
            "Cannot connect to the AESA backend. Make sure the server is running."
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
            onChange={(event) => {
              const newSemester =
                event.target.value;

              setSemester(
                newSemester
              );

              try {
                const savedDraft =
                  localStorage.getItem(
                    IMPORT_DRAFT_KEY
                  );

                if (savedDraft) {
                  const draft =
                    JSON.parse(
                      savedDraft
                    );

                  draft.semester =
                    newSemester;

                  localStorage.setItem(
                    IMPORT_DRAFT_KEY,
                    JSON.stringify(
                      draft
                    )
                  );
                }
              } catch (err) {
                console.error(
                  "Failed to save semester:",
                  err
                );
              }
            }}
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
        {/* FILE UPLOAD */}
        {/* ================================================ */}

        <label className="upload-button">

          <Upload
            size={18}
          />

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
        {/* ATTENDANCE PERIOD */}
        {/* ================================================ */}

        {periodStart &&
          periodEnd && (
            <div className="attendance-period-preview">

              <strong>
                Attendance Period
              </strong>

              <span>
                {periodStart}
                {" → "}
                {periodEnd}
              </span>

            </div>
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
                  Semester
                </span>

                <strong>
                  {semester}
                </strong>
              </div>

              <div>
                <span>
                  Attendance Period
                </span>

                <strong>
                  {periodStart}
                  {" → "}
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
                  student={
                    student
                  }
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