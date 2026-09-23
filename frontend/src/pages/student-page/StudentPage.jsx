import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Mail,
  MailWarning,
  PencilLine,

  Send,
  UserRound,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

import {
  getMentorStudents,
  getMentorEmailAlerts,
  getMentorAttendanceRecords,
  getAvailableSquads,
  updateStudentContact,
} from "../../api/mentor";

import {
  calculateOverallAttendance,
  calculateAttendanceWithoutGrowthHour,
  calculateSubjectWiseAttendance,
} from "../../utils/attendanceUtils";
import "./StudentPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getAttendanceStatus = (attendance) => {
  if (Number(attendance) >= 75) return "Good";
  if (Number(attendance) >= 65) return "Warning";
  return "Critical";
};

const getSubjectShortName = (subjectName = "") => {
  const normalizedName = String(subjectName)
    .trim()
    .toLowerCase();

  const subjectShortNames = {
    "computer organisation and architecture": "COA",
    "computer organization and architecture": "COA",
    "discrete mathematics": "DM",
    "environmental sciences": "ES",
    "innovation and design thinking": "IDT",
    "introduction to artificial intelligence": "AI",
    "operating systems": "OS",
    "ui and ux design for computer science engineering": "UI/UX",
    "growth hour": "GH",
  };

  if (subjectShortNames[normalizedName]) {
    return subjectShortNames[normalizedName];
  }

  const words = normalizedName
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 5);
};
// ============================================================
// SUBJECT ATTENDANCE STATUS
//
// Reuses the existing status thresholds above.
// A subject without conducted sessions has no attendance
// to judge, so it is reported as "No Data".
// ============================================================

const getSubjectAttendanceStatus = (conductedSessions, percentage) => {
  if (Number(conductedSessions) <= 0) return "No Data";

  return getAttendanceStatus(percentage);
};

const resolveEmails = (student = {}) => ({
  parentEmail:
    student.parent_email ||
    student.parentEmail ||
    student.parentMail ||
    student.guardian_email ||
    "",
  studentEmail:
    student.email ||
    student.student_email ||
    student.studentEmail ||
    student.mail ||
    "",
});

const getInitialEmailCopy = (student) => {
  const status = getAttendanceStatus(student.attendance);
  const isCritical = status === "Critical";

  return {
    subject: isCritical
      ? "Attendance Alert - Immediate Attention Required"
      : "Attendance Warning",
    message: isCritical
      ? `Your current attendance is ${student.attendance}%. Your attendance is below the required level. Please take immediate steps to improve your attendance.`
      : `Your current attendance is ${student.attendance}%. Please make sure to attend your upcoming classes regularly and maintain the required attendance percentage.`,
  };
};

const applyTemplateVariables = (text, student, mentorName, mentorEmail) =>
  String(text || "")
    .replaceAll("{{studentName}}", student?.name || "")
    .replaceAll("{{attendance}}", String(student?.attendance ?? ""))
    .replaceAll("{{mentorName}}", mentorName || "")
    .replaceAll("{{mentorEmail}}", mentorEmail || "");

const mapStudentDownloadRow = (student) => ({
  "Student Name": student.name || "",
  "Student Email": resolveEmails(student).studentEmail || "",
  Squad: student.squad || "",
  "Attendance Percentage": Number(student.attendance) || 0,
  "Attendance Status": getAttendanceStatus(student.attendance),
  "Parent Name": student.parent_name || "",
  "Parent Email": resolveEmails(student).parentEmail || "",
  "Parent Phone": student.parent_phone || "",
});

// ===========================================================
// EXCEL DOWNLOAD HELPERS
// ===========================================================

const getTodayIso = () =>
  new Date().toISOString().split("T")[0];

const buildFilename = (
  base,
  variant = ""
) => {
  const variantPart =
    variant && !variant.startsWith("_")
      ? `_${variant}`
      : variant;
  return `AESA_${base}${variantPart}_${getTodayIso()}.xlsx`;
};

const downloadExcel = (
  rows,
  sheetName,
  filename
) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName
  );
  XLSX.writeFile(workbook, filename);
}

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
  // PAGINATION
  // ============================================================

  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  // ============================================================
  // ERROR
  // ============================================================

  const [error, setError] = useState("");
  const [emailFeedback, setEmailFeedback] = useState("");
  const [confirmBulkSend, setConfirmBulkSend] = useState(false);

  // ============================================================
  // EMAIL AUTOMATION (reused from EmailAutomation.jsx)
  // ============================================================

  const [mentorName, setMentorName] = useState("Mentor");
  const [mentorEmail, setMentorEmail] = useState("");
  const [emailDate, setEmailDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [emailOverrides, setEmailOverrides] = useState({});
  const [sendingIds, setSendingIds] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailModalMode, setEmailModalMode] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSubject, setTemplateSubject] = useState(
    "Attendance Warning - Low Attendance"
  );
  const [templateMessage, setTemplateMessage] = useState(
    `Dear {{studentName}},

Your current attendance is {{attendance}}%.

The required attendance percentage is 75%.
Please make sure to attend your upcoming classes regularly.

Regards,
{{mentorName}}
AESA`
  );

  // ============================================================
  // MODALS
  // ============================================================

  const [selectedStudent, setSelectedStudent] = useState(null);

  // ----------------------------------------------------------
  // ATTENDANCE CALCULATION TOGGLE (STUDENT PROFILE POPUP ONLY)
  //
  //   true  -> existing overall attendance
  //   false -> attendance without growth hour
  //            (present sessions / conducted sessions)
  // ----------------------------------------------------------

  const [showOverallAttendance, setShowOverallAttendance] = useState(true);

  // ----------------------------------------------------------
  // SUBJECT-WISE ATTENDANCE (STUDENT PROFILE POPUP ONLY)
  //
  // controlled by the [ Subjects ] button on each student card.
  //
  //   true  -> subject-wise section expanded
  //   false -> subject-wise section hidden
  // ----------------------------------------------------------

  const [showSubjects, setShowSubjects] = useState(false);

  // Existing attendance rows (subjects + growth hour) used
  // only to count present / conducted sessions in the popup.
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [showAddStudent, setShowAddStudent] = useState(false);



  // ===========================================================
  // CUSTOM DOWNLOAD STATE
  // ===========================================================
  const [customDownloadThreshold, setCustomDownloadThreshold] =
    useState("");

  const [attendanceDropdownOpen, setAttendanceDropdownOpen] =
    useState(false);

  // ============================================================
  // PARENT DETAILS
  // ============================================================

  const resetToFirstPage = () => setCurrentPage(1);

  // ============================================================
  // OPEN STUDENT PROFILE POPUP
  //
  // withSubjects = false -> student name click, popup opens
  //                         normally (toggle reset to ON,
  //                         subject-wise section hidden)
  //
  // withSubjects = true  -> [ Subjects ] button click, popup
  //                         opens with the subject-wise
  //                         section expanded
  // ============================================================

  const openStudentProfile = (student, withSubjects = false) => {
    setSelectedStudent(student);

    // The attendance calculation toggle always starts at ON
    // when a student profile is opened.
    setShowOverallAttendance(true);

    setShowSubjects(withSubjects);
  };

  // ============================================================
  // [ SUBJECTS ] BUTTON
  //
  // - profile popup closed (or showing another student)
  //     -> open the popup with the subject-wise section shown
  // - popup already open for the same student
  //     -> simply show / hide the subject-wise section
  //
  // The section is shown/hidden only. No extra ON/OFF toggle
  // is added for subjects.
  // ============================================================

  const handleSubjectsToggle = (student) => {
    const isSameStudentOpen =
      selectedStudent !== null &&
      String(selectedStudent.id) === String(student.id);

    if (!isSameStudentOpen) {
      openStudentProfile(student, true);
      return;
    }

    setShowSubjects((value) => !value);
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

      let alertLookup = new Map();
      try {
        const alertResult = await getMentorEmailAlerts();
        const alertStudents = alertResult?.students || [];
        alertLookup = new Map(
          alertStudents.map((item) => [String(item.id), item])
        );
        if (alertResult?.mentorName) setMentorName(alertResult.mentorName);
        if (alertResult?.mentorEmail) setMentorEmail(alertResult.mentorEmail);
        if (alertResult?.attendanceDate) setEmailDate(alertResult.attendanceDate);
      } catch (alertError) {
        console.warn("Email alert metadata unavailable:", alertError);
      }

      // ----------------------------------------------------------
      // ATTENDANCE RECORDS
      //
      // Existing attendance rows for the students this user can
      // see. Used ONLY by the Student Profile popup to count
      // present / conducted sessions across all subjects.
      //
      // This does not change import, database or email logic.
      // ----------------------------------------------------------

      try {
        const attendanceResult = await getMentorAttendanceRecords();

        setAttendanceRecords(attendanceResult?.records || []);
      } catch (attendanceError) {
        console.warn("Attendance records unavailable:", attendanceError);

        setAttendanceRecords([]);
      }

      // ----------------------------------------------------------
      // FORMAT STUDENTS
      // ----------------------------------------------------------

      const fetchedStudents = (result.students || []).map(
        (student) => {
          const attendanceValue =
            student.attendance ??
            calculateOverallAttendance(student);

          const alertMatch = alertLookup.get(String(student.id));
          const emails = resolveEmails({
            ...student,
            parent_email:
              student.parent_email || alertMatch?.parentEmail || "",
            email: student.email || alertMatch?.email || "",
          });
          const initialCopy = getInitialEmailCopy({
            ...student,
            attendance: Number(attendanceValue) || 0,
          });

          return {
            ...student,

            attendance:
              Number(attendanceValue) || 0,
            parent_email: emails.parentEmail,
            parentEmail: emails.parentEmail,
            email: emails.studentEmail,
            studentEmail: emails.studentEmail,
            emailSubject:
              student.emailSubject || alertMatch?.subject || initialCopy.subject,
            emailMessage:
              student.emailMessage || alertMatch?.message || initialCopy.message,
          };
        }
      );

      // ----------------------------------------------------------
      // DEBUG
      // ----------------------------------------------------------


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

          setShowOverallAttendance(true);
          setShowSubjects(false);
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

  const getEmailContent = (student) => {
    const override = emailOverrides[String(student?.id)] || {};
    return {
      subject: override.subject ?? student?.emailSubject ?? "",
      message: override.message ?? student?.emailMessage ?? "",
    };
  };

  const filteredStudents =
    students.filter((student) => {
      const searchValue =
        search.trim().toLowerCase();

      const emails = resolveEmails(student);

      const matchesSearch =
        !searchValue ||
        student.name
          ?.toLowerCase()
          .includes(searchValue) ||
        emails.studentEmail
          ?.toLowerCase()
          .includes(searchValue) ||
        emails.parentEmail
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
      const customThreshold = Number(customDownloadThreshold);

      const matchesAttendance =
        attendanceFilter === "all" ||
        (attendanceFilter === "below75" && attendance < 75) ||
        (attendanceFilter === "above75" && attendance >= 75) ||
        (
          attendanceFilter === "custom" &&
          customDownloadThreshold !== "" &&
          attendance < customThreshold
        );

      return (
        matchesSearch &&
        matchesSquad &&
        matchesAttendance
      );

    });

  const studentsMatchingCurrentAttendanceFilter =
    filteredStudents;




  const baseFilteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const value = search.trim().toLowerCase();
        const emails = resolveEmails(student);
        const matchesSearch =
          !value ||
          student.name?.toLowerCase().includes(value) ||
          emails.studentEmail?.toLowerCase().includes(value) ||
          emails.parentEmail?.toLowerCase().includes(value) ||
          String(student.id).toLowerCase().includes(value);
        const matchesSquad =
          !squad ||
          String(student.squad).trim() === String(squad).trim();
        return matchesSearch && matchesSquad;
      }),
    [students, search, squad]
  );

  const summary = useMemo(() => {
    const total = baseFilteredStudents.length;
    const below = baseFilteredStudents.filter(
      (student) => Number(student.attendance) < 75
    ).length;
    return { total, below, above: total - below };
  }, [baseFilteredStudents]);

  const below75Students = useMemo(
    () =>
      students.filter(
        (student) => Number(student.attendance) < 75
      ),
    [students]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / studentsPerPage)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice(
    (safeCurrentPage - 1) * studentsPerPage,
    safeCurrentPage * studentsPerPage
  );

  // ============================================================
  // SELECTED STUDENT - ATTENDANCE WITHOUT GROWTH HOUR
  //
  // Counts present / conducted sessions for the student whose
  // profile popup is open, using the existing attendance rows:
  //
  //   present   = sum of sessions_attended  (all subjects)
  //   conducted = sum of sessions_conducted (all subjects)
  //
  // Growth hour rows are excluded by the helper.
  // ============================================================

  const selectedStudentAttendanceRecords = useMemo(() => {
    if (!selectedStudent) return [];

    return attendanceRecords.filter(
      (record) =>
        String(record?.student_id ?? "") === String(selectedStudent.id)
    );
  }, [attendanceRecords, selectedStudent]);

  const {
    presentSessions,
    conductedSessions,
    percentage: withoutGrowthHourAttendance,
  } = calculateAttendanceWithoutGrowthHour(selectedStudentAttendanceRecords);

  // ============================================================
  // SELECTED STUDENT - SUBJECT-WISE ATTENDANCE
  //
  // One entry per subject, built from the same existing
  // attendance rows. Subject names come from the records
  // (subjects.name) - nothing is hardcoded.
  //
  // Growth hour rows are excluded by the helper.
  // ============================================================

  const subjectWiseAttendance = useMemo(
    () =>
      calculateSubjectWiseAttendance(
        selectedStudentAttendanceRecords
      ),
    [selectedStudentAttendanceRecords]
  );

  const handleSend = async (student, bulk = false) => {
    setEmailFeedback("");
    const target =
      students.find((item) => String(item.id) === String(student.id)) ||
      student;
    const content = getEmailContent(target);
    const emails = resolveEmails(target);
    if (!emails.parentEmail) {
      setEmailFeedback(`Parent email missing for ${target.name}.`);
      return false;
    }
    if (!bulk) setSendingIds((prev) => [...prev, target.id]);
    try {
      const response = await fetch(`${API_URL}/api/email-automation/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: [target.id],
          sendType: bulk ? "automatic" : "individual",
          mentorName,
          mentorEmail,
          attendanceDate: emailDate,
          studentId: target.id,
          studentName: target.name,
          studentEmail: emails.studentEmail,
          parentEmail: emails.parentEmail,
          subject: content.subject,
          message: content.message,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to send email.");
      }
      if (!bulk) {
        setEmailFeedback(`Email sent to parent of ${target.name}.`);
        setSelectedEmail(null);
        setEmailModalMode(null);
      }
      return true;
    } catch (sendError) {
      if (!bulk) setEmailFeedback(sendError.message);
      else throw sendError;
      return false;
    } finally {
      if (!bulk) {
        setSendingIds((prev) => prev.filter((id) => id !== target.id));
      }
    }
  };

  const handleSendAllBelow75 = async () => {
    const eligible = below75Students.filter(
      (student) => resolveEmails(student).parentEmail
    );
    if (eligible.length === 0) {
      setEmailFeedback("No eligible students below 75%.");
      setConfirmBulkSend(false);
      return;
    }
    setSendingIds(eligible.map((student) => student.id));
    setEmailFeedback("");
    let sent = 0;
    let failed = 0;
    for (const student of eligible) {
      try {
        await handleSend(student, true);
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    setSendingIds([]);
    setConfirmBulkSend(false);
    setEmailFeedback(
      failed === 0
        ? `Sent ${sent} alert${sent === 1 ? "" : "s"} below 75%.`
        : `Sent ${sent}, failed ${failed}.`
    );
  };

  const openEmailPreview = (student) => {
    const content = getEmailContent(student);
    setSelectedEmail({ ...student, ...content });
    setEmailModalMode("preview");
  };

  const openEmailEditor = (student) => {
    const content = getEmailContent(student);
    setSelectedEmail({ ...student, ...content });
    setEditSubject(content.subject);
    setEditMessage(content.message);
    setEmailModalMode("edit");
  };

  const handleSaveEdit = () => {
    if (!selectedEmail) return;
    setEmailOverrides((prev) => ({
      ...prev,
      [String(selectedEmail.id)]: {
        subject: editSubject,
        message: editMessage,
      },
    }));
    setStudents((prev) =>
      prev.map((item) =>
        String(item.id) === String(selectedEmail.id)
          ? { ...item, emailSubject: editSubject, emailMessage: editMessage }
          : item
      )
    );
    setSelectedEmail({ ...selectedEmail, subject: editSubject, message: editMessage });
    setEmailModalMode("preview");
  };

  const handleSaveTemplate = () => {
    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        emailSubject: applyTemplateVariables(templateSubject, student, mentorName, mentorEmail),
        emailMessage: applyTemplateVariables(templateMessage, student, mentorName, mentorEmail),
      }))
    );
    setEmailOverrides((prev) => {
      const copy = { ...prev };
      students.forEach((student) => {
        copy[String(student.id)] = {
          subject: applyTemplateVariables(templateSubject, student, mentorName, mentorEmail),
          message: applyTemplateVariables(templateMessage, student, mentorName, mentorEmail),
        };
      });
      return copy;
    });
    setShowTemplateModal(false);
    setEmailFeedback("Template applied to all loaded students.");
  };

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
      buildFilename("All_Students")
    );
  };

  const handleDownloadBelow75 = () => {
    const studentsToDownload = baseFilteredStudents.filter(
      (student) => Number(student.attendance) < 75
    );

    if (studentsToDownload.length === 0) {
      alert("No students below 75% to download.");
      return;
    }

    downloadExcel(
      studentsToDownload.map(mapStudentDownloadRow),
      "Below 75",
      buildFilename("Below_75_Percent_Attendance")
    );
  };
  const handleDownloadAbove75 = () => {
    const studentsToDownload = baseFilteredStudents.filter(
      (student) => Number(student.attendance) >= 75
    );

    if (studentsToDownload.length === 0) {
      alert("No students at or above 75% to download.");
      return;
    }

    downloadExcel(
      studentsToDownload.map(mapStudentDownloadRow),
      "75 and Above",
      buildFilename("75_Percent_And_Above_Attendance")
    );
  };

  // ===========================================================
  // DYNAMIC DOWNLOAD HELPER
  // ===========================================================
  const handleDynamicDownload = () => {
    if (attendanceFilter === "all") {
      handleDownloadStudents();
      return;
    }

    if (attendanceFilter === "below75") {
      handleDownloadBelow75();
      return;
    }

    if (attendanceFilter === "above75") {
      handleDownloadAbove75();
      return;
    }

    if (attendanceFilter === "custom") {
      const threshold = Number(customDownloadThreshold);

      if (
        customDownloadThreshold === "" ||
        Number.isNaN(threshold) ||
        threshold < 0 ||
        threshold > 100
      ) {
        alert("Please enter a custom attendance percentage between 0 and 100.");
        return;
      }

      const studentsToDownload = baseFilteredStudents.filter(
        (student) => Number(student.attendance) < threshold
      );

      if (studentsToDownload.length === 0) {
        alert(`No students below ${threshold}%.`);
        return;
      }

      downloadExcel(
        studentsToDownload.map(mapStudentDownloadRow),
        `Below ${threshold}%`,
        buildFilename(`Below_${threshold}_Percent_Attendance`)
      );
    }
  };

  // ===========================================================
  // DYNAMIC DOWNLOAD BUTTON LABEL
  // ===========================================================
  const downloadButtonLabel = (() => {
    if (attendanceFilter === "all") {
      return "Download All Students";
    }

    if (attendanceFilter === "below75") {
      return "Download Below 75%";
    }

    if (attendanceFilter === "above75") {
      return "Download 75% and Above";
    }

    if (
      attendanceFilter === "custom" &&
      customDownloadThreshold !== ""
    ) {
      return `Download Below ${customDownloadThreshold}%`;
    }

    return "Download";
  })();

  // ===========================================================
  // CUSTOM DOWNLOAD VALIDATION HELPER
  // ===========================================================


  const clearFilters = () => {
    setSearch("");
    setAttendanceFilter("all");
    setCustomDownloadThreshold("");
    setAttendanceDropdownOpen(false);

    if (jobRole === "campus_manager") {
      setSquad("");
    }

    resetToFirstPage();
  };


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
              {" Â· "}
              {squad
                ? `Viewing Squad ${squad}`
                : "Viewing all squads"}
              {attendanceFilter === "below75"
                ? " Â· Below 75%"
                : attendanceFilter === "above75"
                  ? " Â· 75% and above"
                  : ""}
            </p>
          )}

        </div>

        {/* ----------------------------------------------------
            DATE + USER META + ACTIONS
        ---------------------------------------------------- */}

        <div className="student-header-actions">

          <div className="student-header-meta">
            <span className="student-meta-item">
              <CalendarDays size={15} />
              {emailDate}
            </span>
            <span className="student-meta-item student-mentor-item">
              <UserRound size={15} />
              <span className="mentor-text">
                {mentorName}
                {mentorEmail ? ` Â· ${mentorEmail}` : ""}
                {jobRole === "mentor" && assignedSquad
                  ? ` Â· Squad ${assignedSquad}`
                  : jobRole === "campus_manager"
                    ? " Â· Campus Manager"
                    : ""}
              </span>
            </span>
          </div>


        </div>

      </div>

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="statistics-grid combined-summary">
        <div className="stat-card">
          <p>Total Students</p>
          <h2>{summary.total}</h2>
          <span>Loaded for current search and squad</span>
        </div>
        <div className="stat-card stat-below">
          <p>Below 75%</p>
          <h2>{summary.below}</h2>
          <span>Needs parent notification</span>
        </div>
        <div className="stat-card stat-above">
          <p>75% and Above</p>
          <h2>{summary.above}</h2>
          <span>Meeting attendance requirement</span>
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

      {emailFeedback && (
        <div className="email-feedback" role="status">
          <Mail size={16} />
          {emailFeedback}
        </div>
      )}

      {/* ======================================================
          STUDENT DETAILS MODAL
      ====================================================== */}

      {/* ======================================================
          SEARCH + FILTERS
      ====================================================== */}

      <div className="filter-container combined-filter-bar">

        <div className="filter-row filter-row-top">

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
              placeholder="Search students by name, email or student ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetToFirstPage();
              }}
            />

          </div>

          <select
            value={squad}
            onChange={(e) => {
              setSquad(e.target.value);
              resetToFirstPage();
            }}
            disabled={jobRole === "mentor"}
          >
            <option value="">All Squads</option>
            {jobRole === "mentor" && assignedSquad ? (
              <option value={assignedSquad}>Squad {assignedSquad}</option>
            ) : (
              squads.map((availableSquad) => (
                <option key={String(availableSquad)} value={String(availableSquad)}>
                  Squad {availableSquad}
                </option>
              ))
            )}
            {jobRole !== "mentor" &&
              squads.length === 0 && (
                <>
                  <option value="138">Squad 138</option>
                  <option value="139">Squad 139</option>
                </>
              )}
          </select>

          <div className="attendance-dropdown">
            <button
              type="button"
              className="attendance-dropdown-trigger"
              onClick={() =>
                setAttendanceDropdownOpen((previous) => !previous)
              }
              aria-expanded={attendanceDropdownOpen}
              aria-haspopup="listbox"
            >
              <span>
                {attendanceFilter === "all" && "All Students"}

                {attendanceFilter === "below75" && "Below 75%"}

                {attendanceFilter === "above75" && "75% and Above"}

                {attendanceFilter === "custom" &&
                  customDownloadThreshold !== "" &&
                  `Below ${customDownloadThreshold}%`}

                {attendanceFilter === "custom" &&
                  customDownloadThreshold === "" &&
                  "Custom Attendance"}
              </span>

              <ChevronDown size={18} />
            </button>

            {attendanceDropdownOpen && (
              <div className="attendance-dropdown-menu">

                <button
                  type="button"
                  className="attendance-dropdown-option"
                  onClick={() => {
                    setAttendanceFilter("all");
                    setCustomDownloadThreshold("");
                    setAttendanceDropdownOpen(false);
                    resetToFirstPage();
                  }}
                >
                  All Students
                </button>

                <button
                  type="button"
                  className="attendance-dropdown-option"
                  onClick={() => {
                    setAttendanceFilter("below75");
                    setCustomDownloadThreshold("");
                    setAttendanceDropdownOpen(false);
                    resetToFirstPage();
                  }}
                >
                  Below 75%
                </button>

                <button
                  type="button"
                  className="attendance-dropdown-option"
                  onClick={() => {
                    setAttendanceFilter("above75");
                    setCustomDownloadThreshold("");
                    setAttendanceDropdownOpen(false);
                    resetToFirstPage();
                  }}
                >
                  75% and Above
                </button>

                <div
                  className="attendance-custom-option"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <span className="attendance-custom-label">
                    Custom
                  </span>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={customDownloadThreshold}
                    placeholder="60"
                    onChange={(event) => {
                      const value = event.target.value;

                      if (value === "") {
                        setCustomDownloadThreshold("");
                        setAttendanceFilter("custom");
                        resetToFirstPage();
                        return;
                      }

                      const numberValue = Number(value);

                      if (numberValue >= 0 && numberValue <= 100) {
                        setCustomDownloadThreshold(value);
                        setAttendanceFilter("custom");
                        resetToFirstPage();
                      }
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    aria-label="Custom attendance percentage"
                  />

                  <span className="attendance-custom-percent">
                    %
                  </span>
                </div>

              </div>
            )}
          </div>

        </div>

        <div className="filter-row filter-row-actions">

          <button
            className="send-all-btn"
            type="button"
            onClick={() => setConfirmBulkSend(true)}
            disabled={loading || below75Students.length === 0}
            title="Send alerts only to students below 75%"
          >
            <Send size={16} />
            Send All Below 75% ({below75Students.length})
          </button>

          <button
            className="template-action-btn"
            type="button"
            onClick={() => setShowTemplateModal(true)}
          >
            <PencilLine size={16} />
            Edit Email Template
          </button>

          <button
            className="import-student-btn filter-btn"
            type="button"
            onClick={handleDynamicDownload}
            disabled={loading}
          >
            <Download size={16} />
            {downloadButtonLabel}
          </button>



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

      </div>

      {/* ======================================================
          STUDENT LIST
      ====================================================== */}

      <div className="student-list-section">

        <div className="student-list-heading">
          <h2>Students</h2>
          {!loading && (
            <span className="student-count-text">
              {filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"}
            </span>
          )}
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
          <>
            {/* ==================================================
            STUDENT CARDS
          ================================================== */}
            <div className="student-table-scroll">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student Email</th>
                    <th>Squad</th>
                    <th>Attendance %</th>
                    {/* <th>Status</th> */}
                    <th>Parent Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedStudents.map((student) => {
                    const emails = resolveEmails(student);
                    const attendance = Number(student.attendance) || 0;
                    const isSending = sendingIds.includes(student.id);
                    const status = getAttendanceStatus(attendance);

                    return (
                      <tr
                        key={student.id}
                        className={
                          attendance < 75 ? "student-row-below" : ""
                        }
                      >
                        {/* STUDENT */}
                        <td className="student-name-cell">
                          <button
                            type="button"
                            className="student-table-name"
                            onClick={() =>
                              openStudentProfile(student, false)
                            }
                          >
                            {student.name || "Unnamed student"}
                          </button>
                        </td>

                        {/* STUDENT EMAIL */}
                        <td className="student-email-cell">
                          {emails.studentEmail || "Not provided"}
                        </td>

                        {/* SQUAD */}
                        <td>
                          <span className="squad-badge">
                            {student.squad || "—"}
                          </span>
                        </td>

                        {/* ATTENDANCE */}
                        <td>
                          <span
                            className={`attendance-badge ${attendance < 75
                              ? "attendance-below"
                              : "attendance-good"
                              }`}
                          >
                            {attendance.toFixed(2)}%
                          </span>
                        </td>

                        {/* STATUS */}
                        {/* <td>
                          <span
                            className={`status-badge status-${status
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {status}
                          </span>
                        </td> */}

                        {/* PARENT EMAIL */}
                        <td className="parent-email-cell">
                          {emails.parentEmail || "Parent email missing"}
                        </td>

                        {/* ACTIONS */}
                        <td className="student-action-cell">
                          <div className="table-actions">
                            <button
                              type="button"
                              className="subjects-button"
                              aria-expanded={
                                selectedStudent !== null &&
                                String(selectedStudent.id) ===
                                String(student.id) &&
                                showSubjects
                              }
                              onClick={() =>
                                handleSubjectsToggle(student)
                              }
                            >
                              {selectedStudent !== null &&
                                String(selectedStudent.id) ===
                                String(student.id) &&
                                showSubjects
                                ? "Hide Subjects"
                                : "Subjects"}
                            </button>

                            <button
                              type="button"
                              className="preview-button"
                              onClick={() =>
                                openEmailPreview(student)
                              }
                            >
                              Preview
                            </button>

                            <button
                              type="button"
                              className="edit-button"
                              onClick={() =>
                                openEmailEditor(student)
                              }
                              disabled={isSending}
                            >
                              Edit Email
                            </button>

                            <button
                              type="button"
                              className="send-button"
                              onClick={() =>
                                handleSend(student)
                              }
                              disabled={isSending}
                            >
                              {isSending
                                ? "Sending..."
                                : "Send Email"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination combined-pagination">
              <span className="pagination-count">
                Showing{" "}
                <strong>
                  {filteredStudents.length === 0
                    ? 0
                    : (safeCurrentPage - 1) * studentsPerPage + 1}
                  {" - "}
                  {Math.min(safeCurrentPage * studentsPerPage, filteredStudents.length)}
                </strong>{" "}
                of <strong>{filteredStudents.length}</strong> students
              </span>
              <div className="pagination-right">
                <label className="per-page-label">
                  Students per page:
                  <select
                    value={studentsPerPage}
                    onChange={(event) => {
                      setStudentsPerPage(Number(event.target.value));
                      resetToFirstPage();
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>

                </label>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(safeCurrentPage - 1)}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter((page) => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      return Math.abs(page - safeCurrentPage) <= 1;
                    })
                    .map((page, position, visible) => {
                      const previous = visible[position - 1];
                      const gap = previous && page - previous > 1;
                      return (
                        <span key={page} className="page-number-wrap">
                          {gap && <span className="page-gap">...</span>}
                          <button
                            type="button"
                            className={page === safeCurrentPage ? "active-page" : ""}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </span>
                      );
                    })}
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(safeCurrentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>

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
                X
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
                  ATTENDANCE CALCULATION
                  (toggle exists ONLY inside this popup)
              ================================================= */}

              <div className="profile-section attendance-calculation">

                <div className="attendance-calculation-header">

                  <h4>
                    Attendance Calculation
                  </h4>

                  <button
                    className={`attendance-toggle ${showOverallAttendance ? "on" : "off"}`}
                    type="button"
                    role="switch"
                    aria-checked={showOverallAttendance}
                    aria-label="Toggle growth hour in the attendance calculation"
                    onClick={() =>
                      setShowOverallAttendance((value) => !value)
                    }
                  >
                    <span className="attendance-toggle-track">
                      <span className="attendance-toggle-thumb" />
                    </span>

                    <span className="attendance-toggle-label">
                      {showOverallAttendance ? "ON" : "OFF"}
                    </span>
                  </button>

                </div>

                {/* ==============================================
                    TOGGLE ON - EXISTING OVERALL ATTENDANCE
                ============================================== */}

                {showOverallAttendance ? (

                  <div className="attendance-calculation-result">

                    <span className="attendance-calculation-label">
                      Overall Attendance
                    </span>

                    <strong className="attendance-calculation-value">
                      {Number(selectedStudent.attendance || 0).toFixed(2)}
                      %
                    </strong>

                  </div>

                ) : (

                  /* ==============================================
                     TOGGLE OFF - WITHOUT GROWTH HOUR
                  ============================================== */

                  <div className="attendance-calculation-result">

                    <span className="attendance-calculation-label">
                      Attendance Without Growth Hour
                    </span>

                    <strong className="attendance-calculation-value">
                      {(conductedSessions > 0
                        ? withoutGrowthHourAttendance
                        : 0
                      ).toFixed(2)}
                      %
                    </strong>

                    <div className="attendance-calculation-counts">

                      <div>

                        <span>
                          Present Sessions
                        </span>

                        <strong>
                          {presentSessions}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Conducted Sessions
                        </span>

                        <strong>
                          {conductedSessions}
                        </strong>

                      </div>

                    </div>

                    {conductedSessions === 0 && (

                      <p className="attendance-calculation-note">
                        No conducted sessions available.
                      </p>

                    )}

                  </div>

                )}

              </div>

              {/* =================================================
                  SUBJECT-WISE ATTENDANCE
                  (shown / hidden by the [ Subjects ] button)
              ================================================= */}

              {showSubjects && (

                <div className="profile-section subject-wise-section">



                  <h4>
                    Subject-wise Attendance
                  </h4>
                  <div className="subject-attendance-table-wrapper">
                    <table className="subject-attendance-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Classes Attended</th>
                          <th>Classes Conducted</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>

                      <tbody>
                        {subjectWiseAttendance.map((subject) => {
                          const conducted =
                            Number(subject.conductedSessions) || 0;

                          const present =
                            Number(subject.presentSessions) || 0;

                          const percentage =
                            conducted > 0
                              ? (present / conducted) * 100
                              : 0;

                          return (
                            <tr
                              key={
                                subject.subjectId ||
                                subject.subjectName
                              }
                            >
                              <td className="subject-short-name">
                                {getSubjectShortName(subject.subjectName)}
                              </td>

                              <td>{present}</td>

                              <td>{conducted}</td>

                              <td className="subject-attendance-percentage">
                                {percentage.toFixed(2)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>





                </div>

              )}

              {/* =================================================
                  MODAL ACTIONS
              ================================================= */}

              <div className="modal-actions">


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
                X
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

        {showTemplateModal && (
          <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
            <div className="email-modal template-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="page-label">EMAIL TEMPLATE</div>
                  <h2>Edit Email Template</h2>
                </div>
                <button type="button" className="close-button" onClick={() => setShowTemplateModal(false)}>X</button>
              </div>
              <div className="template-help">
                <p>Apply this template to all loaded students.</p>
                <p>Variables: <strong>{"{{studentName}}"}</strong> <strong>{"{{attendance}}"}</strong> <strong>{"{{mentorName}}"}</strong> <strong>{"{{mentorEmail}}"}</strong></p>
              </div>
              <div className="template-form">
                <label htmlFor="student-template-subject">Subject</label>
                <input id="student-template-subject" className="edit-input" value={templateSubject} onChange={(event) => setTemplateSubject(event.target.value)} />
                <label htmlFor="student-template-message">Message</label>
                <textarea id="student-template-message" className="edit-textarea template-textarea" value={templateMessage} onChange={(event) => setTemplateMessage(event.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowTemplateModal(false)}>Cancel</button>
                <button type="button" className="modal-send-button" onClick={handleSaveTemplate}>Save Template</button>
              </div>
            </div>
          </div>
        )}

        {selectedEmail && emailModalMode && (
          <div className="modal-overlay" onClick={() => { setSelectedEmail(null); setEmailModalMode(null); }}>
            <div className="email-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="page-label">{emailModalMode === "edit" ? "EDIT EMAIL" : "EMAIL PREVIEW"}</div>
                  <h2>Attendance Alert</h2>
                </div>
                <button type="button" className="close-button" onClick={() => { setSelectedEmail(null); setEmailModalMode(null); }}>X</button>
              </div>
              <div className="email-details">
                <div><span>To</span><p>{resolveEmails(selectedEmail).parentEmail || "Parent email missing"}</p></div>
                <div><span>Student</span><p>{selectedEmail.name}</p></div>
                <div><span>Subject</span>{emailModalMode === "edit" ? <input className="edit-input" value={editSubject} onChange={(event) => setEditSubject(event.target.value)} /> : <p>{selectedEmail.subject}</p>}</div>
              </div>
              <div className="email-message">{emailModalMode === "edit" ? <textarea className="edit-textarea" value={editMessage} onChange={(event) => setEditMessage(event.target.value)} /> : <p>{selectedEmail.message}</p>}</div>
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => { setSelectedEmail(null); setEmailModalMode(null); }}>Close</button>
                {emailModalMode === "edit"
                  ? <button type="button" className="modal-send-button" onClick={handleSaveEdit}>Save Changes</button>
                  : <button type="button" className="modal-send-button" onClick={() => handleSend(selectedEmail)} disabled={sendingIds.includes(selectedEmail.id)}>Send Email</button>}
              </div>
            </div>
          </div>
        )}

        {confirmBulkSend && (
          <div className="modal-overlay" onClick={() => setConfirmBulkSend(false)}>
            <div className="email-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="page-label">BULK EMAIL</div>
                  <h2>Send All Below 75%?</h2>
                </div>
                <button type="button" className="close-button" onClick={() => setConfirmBulkSend(false)}>X</button>
              </div>
              <div className="email-message">
                <p>This sends attendance alerts only to students below 75% ({below75Students.length} students). Students at 75% and above are excluded automatically.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setConfirmBulkSend(false)}>Cancel</button>
                <button type="button" className="modal-send-button" onClick={handleSendAllBelow75} disabled={sendingIds.length > 0}>
                  <MailWarning size={15} /> Confirm Send
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default StudentPage; 