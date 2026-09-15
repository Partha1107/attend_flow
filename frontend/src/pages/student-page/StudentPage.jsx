import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

import {
  getMentorStudents,
  getAvailableSquads,
  updateStudentContact,
} from "../../api/mentor";

import { calculateOverallAttendance } from "../../utils/attendanceUtils";
import "./StudentPage.css";

const mapStudentDownloadRow = (student) => ({
  "Student ID": student.id ?? "",
  "Student Name": student.name || "",
  "Student Email": student.email || "",
  "Student Phone Number": student.phone || "",
  "Parent Email": student.parent_email || "",
  "Parent Phone Number": student.parent_phone || "",
  Squad: student.squad || "",
  "Overall Attendance %": Number(student.attendance) || 0,
});

function StudentPage() {
  const [searchParams] = useSearchParams();

  // ============================================================
  // STUDENT DATA
  // ============================================================

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // ROLE / SQUAD
  // ============================================================

  const [jobRole, setJobRole] = useState("");
  const [assignedSquad, setAssignedSquad] = useState("");

  // Campus Manager can select a squad.
  // Mentor cannot change squad.
  const [squad, setSquad] = useState("");
  const [squads, setSquads] = useState([]);

  // ============================================================
  // FILTERS
  // ============================================================

  const [search, setSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  // ============================================================
  // ERROR
  // ============================================================

  const [error, setError] = useState("");

  // ============================================================
  // MODALS
  // ============================================================

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showAddStudent, setShowAddStudent] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsStudent, setDetailsStudent] = useState(null);

  // ============================================================
  // PARENT DETAILS
  // ============================================================

  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  // ============================================================
  // OPEN STUDENT DETAILS
  // ============================================================

  const openDetailsModal = (student) => {
    setDetailsStudent(student);

    setParentEmail(student.parent_email || "");
    setParentPhone(student.parent_phone || "");

    setShowDetailsModal(true);
  };

  // ============================================================
  // SAVE STUDENT CONTACT DETAILS
  // ============================================================

  const saveStudentDetails = async (e) => {
    e.preventDefault();

    if (!detailsStudent) {
      return;
    }

    try {
      setError("");

      const result = await updateStudentContact(
        detailsStudent.id,
        {
          parent_email: parentEmail.trim(),
          parent_phone: parentPhone.trim(),
        }
      );

      if (!result.success) {
        throw new Error(
          result.message || "Failed to save student details."
        );
      }

      // ----------------------------------------------------------
      // UPDATE STUDENT IN TABLE
      // ----------------------------------------------------------

      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          student.id === detailsStudent.id
            ? {
                ...student,
                ...result.student,
              }
            : student
        )
      );

      // ----------------------------------------------------------
      // UPDATE SELECTED STUDENT
      // ----------------------------------------------------------

      setSelectedStudent((currentStudent) => {
        if (!currentStudent) {
          return currentStudent;
        }

        if (currentStudent.id !== detailsStudent.id) {
          return currentStudent;
        }

        return {
          ...currentStudent,
          ...result.student,
        };
      });

      // ----------------------------------------------------------
      // CLOSE MODAL
      // ----------------------------------------------------------

      setShowDetailsModal(false);
      setDetailsStudent(null);

      alert("Student details saved successfully.");
    } catch (error) {
      console.error(
        "Save student details error:",
        error
      );

      alert(
        error.message ||
          "Failed to save student details."
      );
    }
  };

  // ============================================================
  // FETCH STUDENTS
  // ============================================================

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * IMPORTANT:
       *
       * The backend decides which students this user
       * is allowed to see.
       *
       * Mentor:
       *   -> only assigned squad
       *
       * Campus Manager:
       *   -> all students
       */

      const result = await getMentorStudents();

      // ----------------------------------------------------------
      // FORMAT STUDENTS
      // ----------------------------------------------------------

      const fetchedStudents = (result.students || []).map(
        (student) => {
          const attendanceValue =
            student.attendance ??
            calculateOverallAttendance(student);

          return {
            ...student,

            attendance:
              Number(attendanceValue) || 0,
          };
        }
      );

      // ----------------------------------------------------------
      // DEBUG
      // ----------------------------------------------------------

      console.table(
        fetchedStudents.map((student) => ({
          name: student.name,
          email: student.email,
          squad: student.squad,
          attendance: student.attendance,
          subjects:
            student.subjects?.length || 0,
        }))
      );

      // ----------------------------------------------------------
      // ROLE
      // ----------------------------------------------------------

      const returnedJobRole =
        result.jobRole || "mentor";

      setJobRole(returnedJobRole);

      // ----------------------------------------------------------
      // SQUAD
      // ----------------------------------------------------------

      const returnedSquad =
        result.squad || "";

      setAssignedSquad(returnedSquad);

      if (returnedJobRole === "mentor") {
        /*
         * Mentor squad is controlled by backend.
         *
         * The mentor cannot switch squads.
         */
        setSquad(returnedSquad);
      } else {
        /*
         * Campus Manager:
         *
         * Empty squad means all squads.
         */
        setSquad("");
      }

      // ----------------------------------------------------------
      // STUDENTS
      // ----------------------------------------------------------

      setStudents(fetchedStudents);

      // ----------------------------------------------------------
      // OPEN STUDENT FROM URL
      // ----------------------------------------------------------

      const studentId =
        searchParams.get("student");

      if (studentId) {
        const matchingStudent =
          fetchedStudents.find(
            (student) =>
              String(student.id) ===
              String(studentId)
          );

        if (matchingStudent) {
          setSelectedStudent(
            matchingStudent
          );
        }
      }
    } catch (error) {
      console.error(
        "Failed to fetch students:",
        error
      );

      setError(
        error.message ||
          "Failed to fetch students."
      );
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // ============================================================
  // INITIAL LOAD + IMPORT REFRESH
  // ============================================================

  useEffect(() => {
    const shouldRefreshStudents =
      sessionStorage.getItem(
        "refresh-students"
      );

    if (shouldRefreshStudents) {
      sessionStorage.removeItem(
        "refresh-students"
      );
    }

    const timer =
      window.setTimeout(() => {
        void fetchStudents();
      }, 0);

    // ----------------------------------------------------------
    // ATTENDANCE IMPORT COMPLETED
    // ----------------------------------------------------------

    const handleImportCompleted = () => {
      void fetchStudents();
    };

    // ----------------------------------------------------------
    // LISTEN FOR IMPORT EVENTS
    // ----------------------------------------------------------

    window.addEventListener(
      "attendanceImportCompleted",
      handleImportCompleted
    );

    window.addEventListener(
      "parentEmailImportCompleted",
      handleImportCompleted
    );

    // ----------------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------------

    return () => {
      window.clearTimeout(timer);

      window.removeEventListener(
        "attendanceImportCompleted",
        handleImportCompleted
      );

      window.removeEventListener(
        "parentEmailImportCompleted",
        handleImportCompleted
      );
    };
  }, [fetchStudents]);

  // ============================================================
  // LOAD AVAILABLE SQUADS
  // ============================================================

  useEffect(() => {
    /*
     * Only Campus Manager needs the squad list.
     *
     * Squads are loaded dynamically from backend/database.
     *
     * No hardcoded:
     * 138
     * 139
     * 140
     * etc.
     */

    if (jobRole !== "campus_manager") {
      return;
    }

    const loadSquads = async () => {
      try {
        const result =
          await getAvailableSquads();

        setSquads(
          result.squads || []
        );
      } catch (loadError) {
        console.error(
          "Load squads error:",
          loadError
        );
      }
    };

    void loadSquads();
  }, [jobRole]);

  // ============================================================
  // FILTER STUDENTS
  // ============================================================

  const filteredStudents =
    students.filter((student) => {
      const searchValue =
        search.trim().toLowerCase();

      // ----------------------------------------------------------
      // SEARCH FILTER
      // ----------------------------------------------------------

      const matchesSearch =
        !searchValue ||
        student.name
          ?.toLowerCase()
          .includes(searchValue) ||
        String(student.id)
          .toLowerCase()
          .includes(searchValue);

      // ----------------------------------------------------------
      // SQUAD FILTER
      // ----------------------------------------------------------

      /*
       * Mentor:
       *
       * Backend already returns only the mentor's
       * assigned squad.
       *
       * Therefore the mentor does NOT get a squad
       * selector here.
       *
       * Campus Manager:
       *
       * Can select a squad or view all squads.
       */

      const matchesSquad =
        !squad ||
        String(student.squad).trim() ===
          String(squad).trim();

      const attendance = Number(student.attendance) || 0;
      const matchesAttendance =
        attendanceFilter === "all" ||
        (attendanceFilter === "below75" && attendance < 75) ||
        (attendanceFilter === "above75" && attendance >= 75);

      return (
        matchesSearch &&
        matchesSquad &&
        matchesAttendance
      );
    });

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const handleDownloadStudents = () => {
    if (filteredStudents.length === 0) {
      alert("No students to download.");
      return;
    }

    const worksheetData = filteredStudents.map(mapStudentDownloadRow);
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(
      workbook,
      `AESA_Students_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const clearFilters = () => {
    setSearch("");
    setAttendanceFilter("all");
    setSquad("");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="student-page">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="student-page-header">

        <div>

          <h1>
            Students
          </h1>

          <p>
            Manage student profiles and view
            attendance information.
          </p>

          {/* --------------------------------------------------
              MENTOR
          -------------------------------------------------- */}

          {jobRole === "mentor" &&
            assignedSquad && (
              <p>
                Assigned Squad:{" "}
                <strong>
                  {assignedSquad}
                </strong>
              </p>
            )}

          {/* --------------------------------------------------
              CAMPUS MANAGER
          -------------------------------------------------- */}

          {jobRole === "campus_manager" && (
            <p>
              <strong>
                Campus Manager
              </strong>
              {" · "}
              {squad
                ? `Viewing Squad ${squad}`
                : "Viewing all squads"}
              {attendanceFilter === "below75"
                ? " · Below 75%"
                : attendanceFilter === "above75"
                  ? " · 75% and above"
                  : ""}
            </p>
          )}

        </div>

        {/* ----------------------------------------------------
            REFRESH BUTTON
        ---------------------------------------------------- */}

        <div className="student-header-actions">

          <button
            className="import-student-btn"
            type="button"
            onClick={handleDownloadStudents}
            disabled={loading}
          >
            <Download size={18} />
            Download Students
          </button>

          <button
            className="add-student-btn"
            type="button"
            onClick={fetchStudents}
            disabled={loading}
          >

            <RefreshCw
              size={18}
            />

            {loading
              ? "Refreshing..."
              : "Refresh Students"}

          </button>

        </div>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          className="records-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ======================================================
          STUDENT DETAILS MODAL
      ====================================================== */}

      {showDetailsModal &&
        detailsStudent && (

          <div
            className="modal-overlay"
            onClick={() =>
              setShowDetailsModal(false)
            }
          >

            <div
              className="add-student-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* Close */}
              <button
                className="modal-close"
                type="button"
                onClick={() =>
                  setShowDetailsModal(false)
                }
              >
                ×
              </button>

              {/* Title */}
              <h2>
                {detailsStudent.parent_email
                  ? "Edit Student Details"
                  : "Add Student Details"}
              </h2>

              <p>
                {detailsStudent.name} ·{" "}
                {detailsStudent.email}
              </p>

              {/* Form */}
              <form
                onSubmit={
                  saveStudentDetails
                }
              >

                <div className="form-grid">

                  {/* Student Name */}
                  <input
                    type="text"
                    value={
                      detailsStudent.name ||
                      ""
                    }
                    readOnly
                    placeholder="Student Name"
                  />

                  {/* Student Email */}
                  <input
                    type="email"
                    value={
                      detailsStudent.email ||
                      ""
                    }
                    readOnly
                    placeholder="Student Email"
                  />

                  {/* Parent Email */}
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) =>
                      setParentEmail(
                        e.target.value
                      )
                    }
                    placeholder="Parent Email"
                  />

                  {/* Parent Phone */}
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) =>
                      setParentPhone(
                        e.target.value
                      )
                    }
                    placeholder="Parent Phone"
                  />

                </div>

                {/* Modal Actions */}
                <div className="modal-actions">

                  <button
                    type="button"
                    className="close-profile-btn"
                    onClick={() =>
                      setShowDetailsModal(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="edit-profile-btn"
                  >
                    Save Details
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

      {/* ======================================================
          SEARCH + FILTERS
      ====================================================== */}

      <div className="filter-container">

        {/* ----------------------------------------------------
            SEARCH
        ---------------------------------------------------- */}

        <div className="search-box">

          <svg
            viewBox="0 0 24 24"
            className="search-icon"
            aria-hidden="true"
          >

            <circle
              cx="11"
              cy="11"
              r="7"
            />

            <path d="m20 20-4-4" />

          </svg>

          <input
            type="text"
            placeholder="Search students by name"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>

        {/* ==================================================
            CAMPUS MANAGER SQUAD FILTER
        ================================================== */}

        <div className="student-filter-buttons">
          <button
            type="button"
            className={`student-filter-btn ${!squad && attendanceFilter === "all" ? "active" : ""}`}
            onClick={() => {
              setSquad("");
              setAttendanceFilter("all");
            }}
          >
            All Students
          </button>

          <button
            type="button"
            className={`student-filter-btn ${squad === "138" ? "active" : ""}`}
            onClick={() => setSquad("138")}
          >
            Squad 138
          </button>

          <button
            type="button"
            className={`student-filter-btn ${squad === "139" ? "active" : ""}`}
            onClick={() => setSquad("139")}
          >
            Squad 139
          </button>

          <button
            type="button"
            className={`student-filter-btn ${attendanceFilter === "below75" ? "active" : ""}`}
            onClick={() => setAttendanceFilter("below75")}
          >
            Below 75%
          </button>

          <button
            type="button"
            className={`student-filter-btn ${attendanceFilter === "above75" ? "active" : ""}`}
            onClick={() => setAttendanceFilter("above75")}
          >
            Above 75%
          </button>
        </div>

        {jobRole ===
          "campus_manager" && (

          <select
            value={squad}
            onChange={(e) =>
              setSquad(
                e.target.value
              )
            }
          >

            <option value="">
              All Squads
            </option>

            {squads.map(
              (availableSquad) => (

                <option
                  key={String(
                    availableSquad
                  )}
                  value={String(
                    availableSquad
                  )}
                >
                  Squad{" "}
                  {availableSquad}
                </option>

              )
            )}

          </select>

        )}

        {/* ----------------------------------------------------
            CLEAR FILTERS
        ---------------------------------------------------- */}

        <button
          className="clear-filter-btn"
          type="button"
          onClick={clearFilters}
        >
          Clear Filters
        </button>

      </div>

      {/* ======================================================
          STUDENT TABLE
      ====================================================== */}

      <div className="student-table-container">

        {/* ----------------------------------------------------
            TABLE HEADER
        ---------------------------------------------------- */}

        <div className="student-table-header">

          <span>
            Student
          </span>

          <span>
            Squad
          </span>

          <span>
            Attendance %
          </span>

          <span>
            Action
          </span>

        </div>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (

          <div className="empty-state">

            <h3>
              Loading students...
            </h3>

          </div>

        ) : filteredStudents.length > 0 ? (

          /* ==================================================
             STUDENT ROWS
          ================================================== */

          filteredStudents.map(
            (student) => (

              <div
                className="student-row"
                key={student.id}
              >

                {/* ------------------------------------------------
                    STUDENT
                ------------------------------------------------ */}

                <div className="student-name">

                  <strong>
                    {student.name}
                  </strong>

                </div>

                {/* ------------------------------------------------
                    SQUAD
                ------------------------------------------------ */}

                <div>
                  {student.squad}
                </div>

                {/* ------------------------------------------------
                    ATTENDANCE
                ------------------------------------------------ */}

                <div>

                  <span
                    className={`attendance-badge ${
                      Number(
                        student.attendance
                      ) < 75
                        ? "attendance-warning"
                        : ""
                    }`}
                  >

                    {student.attendance}%

                  </span>

                </div>

                {/* ------------------------------------------------
                    ACTIONS
                ------------------------------------------------ */}

                <div className="student-actions">

                  {/* View Profile */}
                  <button
                    className="view-profile-btn"
                    type="button"
                    onClick={() =>
                      setSelectedStudent(
                        student
                      )
                    }
                  >
                    View Profile
                  </button>

                  {/* Add/Edit Details */}
                  <button
                    className="add-details-btn"
                    type="button"
                    onClick={() =>
                      openDetailsModal(
                        student
                      )
                    }
                  >
                    {student.parent_email
                      ? "Edit Details"
                      : "Add Details"}
                  </button>

                </div>

              </div>

            )
          )

        ) : (

          /* ==================================================
             NO STUDENTS
          ================================================== */

          <div className="empty-state">

            <h3>
              No students found
            </h3>

            <p>
              Try changing your search
              or filter criteria.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
            >
              Clear Filters
            </button>

          </div>

        )}

        {/* ====================================================
            STUDENT PROFILE MODAL
        ==================================================== */}

        {selectedStudent && (

          <div
            className="modal-overlay"
            onClick={() =>
              setSelectedStudent(null)
            }
          >

            <div
              className="student-profile-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* Close */}
              <button
                className="modal-close"
                type="button"
                onClick={() =>
                  setSelectedStudent(null)
                }
              >
                ×
              </button>

              {/* =================================================
                  PROFILE HEADER
              ================================================= */}

              <div className="profile-header">

                <div className="profile-avatar">

                  {(
                    selectedStudent.name ||
                    "?"
                  )
                    .charAt(0)
                    .toUpperCase()}

                </div>

                <div>

                  <h2>
                    Student Profile
                  </h2>

                  <h3>
                    {selectedStudent.name ||
                      "Unnamed student"}
                  </h3>

                </div>

                <span className="active-badge">
                  Active
                </span>

              </div>

              {/* =================================================
                  PERSONAL INFORMATION
              ================================================= */}

              <div className="profile-section">

                <h4>
                  Personal Information
                </h4>

                <div className="profile-grid">

                  {/* Student Email */}
                  <div>

                    <span>
                      Student Email
                    </span>

                    <strong>
                      {selectedStudent.email ||
                        "Not provided"}
                    </strong>

                  </div>

                  {/* Student Phone Number */}
                  <div>

                    <span>
                      Student Phone Number
                    </span>

                    <strong>
                      {selectedStudent.phone ||
                        "Not provided"}
                    </strong>

                  </div>

                  {/* Parent Phone Number */}
                  <div>

                    <span>
                      Parent Phone Number
                    </span>

                    <strong>
                      {selectedStudent.parent_phone ||
                        "Not provided"}
                    </strong>

                  </div>

                  {/* Parent Email */}
                  <div>

                    <span>
                      Parent Email
                    </span>

                    <strong>
                      {selectedStudent.parent_email ||
                        "Not provided"}
                    </strong>

                  </div>

                </div>

              </div>

              {/* =================================================
                  ACADEMIC INFORMATION
              ================================================= */}

              <div className="profile-section">

                <h4>
                  Academic Information
                </h4>

                <div className="profile-grid">

                  <div>

                    <span>
                      Squad
                    </span>

                    <strong>
                      {selectedStudent.squad ||
                        "Not assigned"}
                    </strong>

                  </div>

                </div>

              </div>

              {/* =================================================
                  ATTENDANCE
              ================================================= */}

              <div className="attendance-summary">

                <div>

                  <span>
                    Overall Attendance
                  </span>

                  <strong>
                    {Number(
                      selectedStudent.attendance ||
                        0
                    )}
                    %
                  </strong>

                </div>

                {/* Progress */}
                <div className="progress-bar">

                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          Number(
                            selectedStudent.attendance
                          ) || 0
                        )
                      )}%`,
                    }}
                  ></div>

                </div>

                <div className="attendance-details">

                  <span>
                    Attendance is calculated
                    from imported records.
                  </span>

                </div>

              </div>

              {/* =================================================
                  MODAL ACTIONS
              ================================================= */}

              <div className="modal-actions">

                <button
                  className="edit-profile-btn"
                  type="button"
                  onClick={() => {
                    const worksheet = XLSX.utils.json_to_sheet([
                      mapStudentDownloadRow(selectedStudent),
                    ]);
                    const workbook = XLSX.utils.book_new();

                    XLSX.utils.book_append_sheet(
                      workbook,
                      worksheet,
                      "Student"
                    );
                    XLSX.writeFile(
                      workbook,
                      `AESA_Student_${selectedStudent.id || "profile"}_${new Date().toISOString().split("T")[0]}.xlsx`
                    );
                  }}
                >
                  Download
                </button>

                <button
                  className="close-profile-btn"
                  type="button"
                  onClick={() =>
                    setSelectedStudent(null)
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

        {/* ====================================================
            ADD STUDENT MODAL
        ==================================================== */}

        {showAddStudent && (

          <div
            className="modal-overlay"
            onClick={() =>
              setShowAddStudent(false)
            }
          >

            <div
              className="add-student-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* Close */}
              <button
                className="modal-close"
                type="button"
                onClick={() =>
                  setShowAddStudent(false)
                }
              >
                ×
              </button>

              <h2>
                Add New Student
              </h2>

              <p>
                Add student information
                to the system.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  alert(
                    "Student added successfully."
                  );

                  setShowAddStudent(
                    false
                  );
                }}
              >

                <div className="form-grid">

                  {/* Full Name */}
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                  />

                  {/* Email */}
                  <input
                    type="email"
                    placeholder="Email"
                    required
                  />

                  {/* Student Phone */}
                  <input
                    type="tel"
                    placeholder="Student Phone Number"
                    required
                  />

                  {/* Parent Phone */}
                  <input
                    type="tel"
                    placeholder="Parent's Number"
                    required
                  />

                  {/* Parent Email */}
                  <input
                    type="email"
                    placeholder="Parent Email"
                    required
                  />

                  {/* Dynamic Squad */}
                  <select
                    required
                    defaultValue={
                      jobRole === "mentor"
                        ? assignedSquad
                        : ""
                    }
                    disabled={
                      jobRole === "mentor"
                    }
                  >

                    <option
                      value=""
                      disabled
                    >
                      Squad
                    </option>

                    {/* Mentor */}
                    {jobRole ===
                      "mentor" &&
                      assignedSquad && (

                        <option
                          value={
                            assignedSquad
                          }
                        >
                          Squad{" "}
                          {
                            assignedSquad
                          }
                        </option>

                      )}

                    {/* Campus Manager */}
                    {jobRole ===
                      "campus_manager" &&
                      squads.map(
                        (
                          availableSquad
                        ) => (

                          <option
                            key={String(
                              availableSquad
                            )}
                            value={String(
                              availableSquad
                            )}
                          >
                            Squad{" "}
                            {
                              availableSquad
                            }
                          </option>

                        )
                      )}

                  </select>

                </div>

                {/* Modal Actions */}
                <div className="modal-actions">

                  <button
                    type="button"
                    className="close-profile-btn"
                    onClick={() =>
                      setShowAddStudent(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="edit-profile-btn"
                  >
                    Add Student
                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

      </div>
    </div>
  );
}

export default StudentPage;