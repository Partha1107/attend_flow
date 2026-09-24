import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Download,
  Eye,
  Mail,
  MailWarning,
  MoreHorizontal,
  Pencil,
  PencilLine,
  Search,
  Send,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

import SkeletonLoading from "../../components/SkeletonLoading";
import {
  getMentorStudents,
  getMentorEmailAlerts,
  getMentorAttendanceRecords,
  getAvailableSquads,
} from "../../api/mentor";
import {
  calculateOverallAttendance,
  calculateAttendanceWithoutGrowthHour,
  calculateSubjectWiseAttendance,
} from "../../utils/attendanceUtils";

import "./StudentPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const getAttendanceStatus = (attendance) => {
  const value = Number(attendance) || 0;
  if (value >= 75) return "Good";
  if (value >= 65) return "Warning";
  return "Critical";
};

const getSubjectShortName = (subjectName = "") => {
  const normalized = String(subjectName).trim().toLowerCase();
  const map = {
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

  if (map[normalized]) return map[normalized];

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 5);
};

const resolveEmails = (student = {}) => ({
  studentEmail:
    student.email ||
    student.student_email ||
    student.studentEmail ||
    student.mail ||
    "",
  parentEmail:
    student.parent_email ||
    student.parentEmail ||
    student.parentMail ||
    student.guardian_email ||
    "",
});

const getInitialEmailCopy = (student) => {
  const critical = getAttendanceStatus(student.attendance) === "Critical";

  return {
    subject: critical
      ? "Attendance Alert - Immediate Attention Required"
      : "Attendance Warning",
    message: critical
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

const subjectName = (record) =>
  String(
    record?.subject_name ?? record?.subjectName ?? record?.subject?.name ?? ""
  ).trim();

const subjectId = (record) =>
  String(
    record?.subject_id ?? record?.subjectId ?? record?.subject?.id ?? ""
  ).trim();

const isGrowthHour = (record) => {
  const type = String(record?.attendance_type ?? "").toLowerCase();
  const name = subjectName(record).toLowerCase();
  return (
    type.includes("growth") ||
    name.includes("growth hour") ||
    name.includes("growth_hour")
  );
};

const getExportSubjects = (records = []) => {
  const map = new Map();

  records.forEach((record) => {
    if (isGrowthHour(record)) return;

    const id = subjectId(record);
    const name = subjectName(record);
    if (!id && !name) return;

    const key = id || name.toLowerCase();
    if (!map.has(key)) map.set(key, { id, name });
  });

  return [...map.values()];
};

const getGrowthHourRecord = (records = []) =>
  records.find((record) => isGrowthHour(record));

const mapStudentDownloadRow = (student, records, exportSubjects) => {
  const studentRecords = records.filter(
    (record) => String(record?.student_id ?? "") === String(student?.id ?? "")
  );

  const emails = resolveEmails(student);
  const row = {
    email: emails.studentEmail,
    Name: student?.name || "",
    Squad: student?.squad || "",
  };

  exportSubjects.forEach((subject, index) => {
    const n = index + 1;
    const record = studentRecords.find((item) => {
      const recordId = subjectId(item);
      const recordName = subjectName(item).toLowerCase();

      return (
        (subject.id && recordId === subject.id) ||
        (!subject.id && recordName === String(subject.name).toLowerCase())
      );
    });

    const conducted = Number(record?.sessions_conducted) || 0;
    const attended = Number(record?.sessions_attended) || 0;
    const absent = Number.isFinite(Number(record?.sessions_absent))
      ? Number(record.sessions_absent)
      : Math.max(conducted - attended, 0);
    const percentage =
      conducted > 0 ? Number(((attended / conducted) * 100).toFixed(2)) : 0;

    row[`Subject ${n} Name`] = subject.name || "";
    row[`Subject ${n} ID`] = subject.id || "";
    row[`Subject ${n} Sessions Conducted`] = conducted;
    row[`Subject ${n} Sessions Attended`] = attended;
    row[`Subject ${n} Sessions Absent`] = absent;
    row[`Subject ${n} Attendance %`] = `${percentage.toFixed(2)}%`;
    row[`Subject ${n} Sessions Marked OD`] =
      Number(record?.sessions_marked_od) || 0;
    row[`Subject ${n} Sessions on Approved Medical Leave (ML)`] =
      Number(record?.sessions_medical_leave) || 0;
    row[`Subject ${n} Sessions Applied Leave`] =
      Number(record?.sessions_applied_leave) || 0;
  });

  const growth = getGrowthHourRecord(studentRecords);
  if (growth) {
    const conducted = Number(growth.sessions_conducted) || 0;
    const attended = Number(growth.sessions_attended) || 0;
    const absent = Number.isFinite(Number(growth.sessions_absent))
      ? Number(growth.sessions_absent)
      : Math.max(conducted - attended, 0);
    const percentage =
      conducted > 0 ? Number(((attended / conducted) * 100).toFixed(2)) : 0;

    row["Growth Hour Name"] = subjectName(growth) || "Growth Hour";
    row["Growth Hour Sessions Conducted"] = conducted;
    row["Growth Hour Sessions Attended"] = attended;
    row["Growth Hour Sessions Absent"] = absent;
    row["Growth Hour Attendance %"] = `${percentage.toFixed(2)}%`;
    row["Growth Hour Sessions Marked OD"] =
      Number(growth.sessions_marked_od) || 0;
    row["Growth Hour Sessions on Approved Medical Leave (ML)"] =
      Number(growth.sessions_medical_leave) || 0;
    row["Growth Hour Sessions Applied Leave"] =
      Number(growth.sessions_applied_leave) || 0;
  }

  return row;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const downloadExcel = (rows, sheetName, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
};

const buildFilename = (name) =>
  `AESA_${String(name).replace(/[^A-Za-z0-9_-]+/g, "_")}_${todayISO()}.xlsx`;

/* Attendance range helpers */
const BELOW_75_MAX = 74.99;

const rangeBounds = (min, max) => ({
  lo: min === "" ? 0 : Number(min),
  hi: max === "" ? 100 : Number(max),
});

const rangeLabel = (min, max) => {
  const { lo, hi } = rangeBounds(min, max);
  if (lo === 0 && hi === BELOW_75_MAX) return "Below 75%";
  if (lo === 75 && hi === 100) return "75% and above";
  return `${lo}%–${hi}%`;
};

const SEND_TO_LABELS = {
  both: "Both",
  student: "Student only",
  parent: "Parent only",
};

/* Module-level cache so the page opens instantly when revisited */
const emptyCache = () => ({
  students: null,
  attendanceRecords: [],
  jobRole: "",
  assignedSquad: "",
  mentorName: "Mentor",
  mentorEmail: "",
  emailDate: "",
});

let studentPageCache = emptyCache();

const hasCache = () => Array.isArray(studentPageCache.students);

// eslint-disable-next-line no-unused-vars
const resetCache = () => {
  studentPageCache = emptyCache();
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function StudentPage() {
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState(
    () => studentPageCache.students || []
  );
  const [attendanceRecords, setAttendanceRecords] = useState(
    () => studentPageCache.attendanceRecords || []
  );
  const [loading, setLoading] = useState(() => !hasCache());
  const [error, setError] = useState("");

  const [jobRole, setJobRole] = useState(studentPageCache.jobRole || "");
  const [assignedSquad, setAssignedSquad] = useState(
    studentPageCache.assignedSquad || ""
  );
  const [squad, setSquad] = useState("");
  const [squads, setSquads] = useState([]);

  /* Filters */
  const [search, setSearch] = useState("");
  const [attendanceMin, setAttendanceMin] = useState("");
  const [attendanceMax, setAttendanceMax] = useState("");
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [sendTo, setSendTo] = useState("both");

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  /* Selection */
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  /* Email */
  const [mentorName, setMentorName] = useState(
    studentPageCache.mentorName || "Mentor"
  );
  const [mentorEmail, setMentorEmail] = useState(
    studentPageCache.mentorEmail || ""
  );
  const [emailDate, setEmailDate] = useState(
    studentPageCache.emailDate || todayISO()
  );
  const [emailOverrides, setEmailOverrides] = useState({});
  const [sendingIds, setSendingIds] = useState([]);
  const [emailFeedback, setEmailFeedback] = useState("");
  const [bulkConfirm, setBulkConfirm] = useState(null); // { kind, list }

  /* Row action menu (fixed-position so the table scroll never clips it) */
  const [rowMenu, setRowMenu] = useState(null); // { student, top, left }

  /* Modals */
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showOverallAttendance, setShowOverallAttendance] = useState(true);
  const [showSubjects, setShowSubjects] = useState(false);

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

  const resetPage = () => setCurrentPage(1);

  /* ---------------- Profile modal ---------------- */

  const openStudentProfile = (student, withSubjects = false) => {
    setSelectedStudent(student);
    setShowOverallAttendance(true);
    setShowSubjects(withSubjects);
  };

  const closeStudentProfile = () => {
    setSelectedStudent(null);
    setShowSubjects(false);
    setShowOverallAttendance(true);
  };

  /* ---------------- Data loading ---------------- */

  const fetchStudents = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError("");

        const result = await getMentorStudents();

        let alertLookup = new Map();
        try {
          const alertResult = await getMentorEmailAlerts();
          const alertStudents = alertResult?.students || [];

          alertLookup = new Map(
            alertStudents.map((item) => [String(item.id), item])
          );

          if (alertResult?.mentorName) {
            setMentorName(alertResult.mentorName);
            studentPageCache.mentorName = alertResult.mentorName;
          }
          if (alertResult?.mentorEmail) {
            setMentorEmail(alertResult.mentorEmail);
            studentPageCache.mentorEmail = alertResult.mentorEmail;
          }
          if (alertResult?.attendanceDate) {
            setEmailDate(alertResult.attendanceDate);
            studentPageCache.emailDate = alertResult.attendanceDate;
          }
        } catch (alertError) {
          console.warn("Email alert metadata unavailable:", alertError);
        }

        try {
          const attendanceResult = await getMentorAttendanceRecords();
          const records = attendanceResult?.records || [];
          setAttendanceRecords(records);
          studentPageCache.attendanceRecords = records;
        } catch (attendanceError) {
          console.warn("Attendance records unavailable:", attendanceError);
        }

        const fetchedStudents = (result.students || []).map((student) => {
          const attendanceValue =
            student.attendance ?? calculateOverallAttendance(student);
          const alert = alertLookup.get(String(student.id));

          const emails = resolveEmails({
            ...student,
            parent_email: student.parent_email || alert?.parentEmail || "",
            email: student.email || alert?.email || "",
          });

          const initialCopy = getInitialEmailCopy({
            ...student,
            attendance: Number(attendanceValue) || 0,
          });

          return {
            ...student,
            attendance: Number(attendanceValue) || 0,
            parent_email: emails.parentEmail,
            parentEmail: emails.parentEmail,
            email: emails.studentEmail,
            studentEmail: emails.studentEmail,
            emailSubject:
              student.emailSubject || alert?.subject || initialCopy.subject,
            emailMessage:
              student.emailMessage || alert?.message || initialCopy.message,
          };
        });

        const role = result.jobRole || "mentor";
        const returnedSquad = result.squad || "";

        setJobRole(role);
        setAssignedSquad(returnedSquad);
        setSquad(role === "mentor" ? returnedSquad : "");

        studentPageCache.jobRole = role;
        studentPageCache.assignedSquad = returnedSquad;
        studentPageCache.students = fetchedStudents;

        setStudents(fetchedStudents);

        const studentId = searchParams.get("student");
        if (studentId) {
          const match = fetchedStudents.find(
            (student) => String(student.id) === String(studentId)
          );
          if (match) openStudentProfile(match, false);
        }
      } catch (fetchError) {
        console.error("Failed to fetch students:", fetchError);
        setError(fetchError.message || "Failed to fetch students.");
        if (!studentPageCache.students) setStudents([]);
      } finally {
        setLoading(false);
      }
    },
    [searchParams]
  );

  useEffect(() => {
    const refreshRequested = sessionStorage.getItem("refresh-students");

    if (refreshRequested) {
      sessionStorage.removeItem("refresh-students");
      void fetchStudents({ silent: false });
    } else {
      void fetchStudents({ silent: hasCache() });
    }

    const handleImportCompleted = () => {
      void fetchStudents({ silent: false });
    };

    window.addEventListener("attendanceImportCompleted", handleImportCompleted);
    window.addEventListener(
      "parentEmailImportCompleted",
      handleImportCompleted
    );

    return () => {
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

  useEffect(() => {
    if (jobRole !== "campus_manager") return;

    const loadSquads = async () => {
      try {
        const result = await getAvailableSquads();
        setSquads(result.squads || []);
      } catch (loadError) {
        console.error("Load squads error:", loadError);
      }
    };

    void loadSquads();
  }, [jobRole]);

  /* Close the floating row menu when the page scrolls or resizes */
  useEffect(() => {
    if (!rowMenu) return undefined;

    const close = () => setRowMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [rowMenu]);

  /* ---------------- Derived data ---------------- */

  const baseFilteredStudents = useMemo(() => {
    const value = search.trim().toLowerCase();

    return students.filter((student) => {
      const emails = resolveEmails(student);
      const matchesSearch =
        !value ||
        student.name?.toLowerCase().includes(value) ||
        emails.studentEmail?.toLowerCase().includes(value) ||
        emails.parentEmail?.toLowerCase().includes(value) ||
        String(student.id).toLowerCase().includes(value);

      const matchesSquad =
        !squad || String(student.squad).trim() === String(squad).trim();

      return matchesSearch && matchesSquad;
    });
  }, [students, search, squad]);

  const { lo: rangeLo, hi: rangeHi } = rangeBounds(
    attendanceMin,
    attendanceMax
  );
  const rangeInvalid = rangeLo > rangeHi;
  const rangeIsDefault = rangeLo === 0 && rangeHi === 100;

  const filteredStudents = useMemo(
    () =>
      baseFilteredStudents.filter((student) => {
        const attendance = Number(student.attendance) || 0;
        return attendance >= rangeLo && attendance <= rangeHi;
      }),
    [baseFilteredStudents, rangeLo, rangeHi]
  );

  const summary = useMemo(() => {
    const total = baseFilteredStudents.length;
    const below = baseFilteredStudents.filter(
      (student) => Number(student.attendance) < 75
    ).length;

    return { total, below, above: total - below };
  }, [baseFilteredStudents]);

  const below75Students = useMemo(
    () => students.filter((student) => Number(student.attendance) < 75),
    [students]
  );

  const exportSubjects = useMemo(
    () => getExportSubjects(attendanceRecords),
    [attendanceRecords]
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

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedIds.has(String(student.id))),
    [students, selectedIds]
  );

  const pageIds = paginatedStudents.map((student) => String(student.id));
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const allOnPageSelected =
    pageIds.length > 0 && selectedOnPage === pageIds.length;
  const someOnPageSelected = selectedOnPage > 0 && !allOnPageSelected;

  const selectedAttendanceRecords = useMemo(() => {
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
  } = calculateAttendanceWithoutGrowthHour(selectedAttendanceRecords);

  const subjectWiseAttendance = useMemo(
    () => calculateSubjectWiseAttendance(selectedAttendanceRecords),
    [selectedAttendanceRecords]
  );

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set([
      1,
      totalPages,
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
    ]);

    return [...pages]
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [safeCurrentPage, totalPages]);

  /* ---------------- Selection ---------------- */

  const toggleStudent = (id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredStudents.map((s) => String(s.id))));
  };

  const clearSelection = () => setSelectedIds(new Set());

  /* ---------------- Email sending ---------------- */

  const getEmailContent = (student) => {
    const override = emailOverrides[String(student?.id)] || {};
    return {
      subject: override.subject ?? student?.emailSubject ?? "",
      message: override.message ?? student?.emailMessage ?? "",
    };
  };

  const getRecipients = (student) => {
    const emails = resolveEmails(student);
    const recipients = [];
    if (sendTo !== "parent" && emails.studentEmail) recipients.push("student");
    if (sendTo !== "student" && emails.parentEmail) recipients.push("parent");
    return recipients;
  };

  const sendOne = async (student, sendType) => {
    const target =
      students.find((item) => String(item.id) === String(student.id)) ||
      student;

    const recipients = getRecipients(target);
    if (recipients.length === 0) {
      const missing =
        sendTo === "student"
          ? "Student"
          : sendTo === "parent"
            ? "Parent"
            : "Student or parent";
      throw new Error(`${missing} email missing for ${target.name}.`);
    }

    const content = getEmailContent(target);
    const emails = resolveEmails(target);

    const response = await fetch(`${API_URL}/api/email-automation/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds: [target.id],
        sendType,
        sendTo,
        recipients,
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

    return { target, recipients };
  };

  const handleSend = async (student) => {
    setEmailFeedback("");
    setSendingIds((prev) => [...prev, student.id]);

    try {
      const { target, recipients } = await sendOne(student, "individual");
      const who = recipients
        .map((item) => (item === "parent" ? "parent" : "student"))
        .join(" and ");
      setEmailFeedback(`Email sent to ${who} of ${target.name}.`);
      closeEmailModal();
    } catch (sendError) {
      setEmailFeedback(sendError.message);
    } finally {
      setSendingIds((prev) => prev.filter((id) => id !== student.id));
    }
  };

  const openBulkConfirm = (kind) => {
    const list = kind === "selected" ? selectedStudents : below75Students;

    if (list.length === 0) {
      setEmailFeedback(
        kind === "selected"
          ? "Select at least one student first."
          : "No students below 75%."
      );
      return;
    }

    setBulkConfirm({ kind, list });
  };

  const handleConfirmBulk = async () => {
    if (!bulkConfirm) return;

    const eligible = bulkConfirm.list.filter(
      (student) => getRecipients(student).length > 0
    );
    const skipped = bulkConfirm.list.length - eligible.length;

    if (eligible.length === 0) {
      setEmailFeedback("None of these students have the required email.");
      setBulkConfirm(null);
      return;
    }

    setSendingIds(eligible.map((student) => student.id));
    setEmailFeedback("");

    let sent = 0;
    let failed = 0;

    for (const student of eligible) {
      try {
        await sendOne(student, "automatic");
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    setSendingIds([]);
    setBulkConfirm(null);

    const parts = [`Sent ${sent}`];
    if (failed) parts.push(`failed ${failed}`);
    if (skipped) parts.push(`skipped ${skipped} (email missing)`);
    setEmailFeedback(`${parts.join(", ")}.`);
  };

  /* ---------------- Email modals ---------------- */

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

  const closeEmailModal = () => {
    setSelectedEmail(null);
    setEmailModalMode(null);
  };

  const handleSaveEdit = () => {
    if (!selectedEmail) return;

    const id = String(selectedEmail.id);
    setEmailOverrides((prev) => ({
      ...prev,
      [id]: { subject: editSubject, message: editMessage },
    }));

    setStudents((prev) =>
      prev.map((student) =>
        String(student.id) === id
          ? { ...student, emailSubject: editSubject, emailMessage: editMessage }
          : student
      )
    );

    setSelectedEmail({
      ...selectedEmail,
      subject: editSubject,
      message: editMessage,
    });
    setEmailModalMode("preview");
  };

  const handleSaveTemplate = () => {
    const nextOverrides = { ...emailOverrides };

    setStudents((prev) =>
      prev.map((student) => {
        const subject = applyTemplateVariables(
          templateSubject,
          student,
          mentorName,
          mentorEmail
        );
        const message = applyTemplateVariables(
          templateMessage,
          student,
          mentorName,
          mentorEmail
        );

        nextOverrides[String(student.id)] = { subject, message };

        return { ...student, emailSubject: subject, emailMessage: message };
      })
    );

    setEmailOverrides(nextOverrides);
    setShowTemplateModal(false);
    setEmailFeedback("Template applied to all loaded students.");
  };

  /* ---------------- Download ---------------- */

  const handleDownload = () => {
    const useSelection = selectedStudents.length > 0;
    const list = useSelection ? selectedStudents : filteredStudents;

    if (list.length === 0) {
      alert("No students to download.");
      return;
    }

    if (rangeInvalid && !useSelection) {
      alert("Minimum attendance is higher than maximum attendance.");
      return;
    }

    const rows = list.map((student) =>
      mapStudentDownloadRow(student, attendanceRecords, exportSubjects)
    );

    const name = useSelection
      ? "Selected_Students"
      : rangeIsDefault
        ? "All_Students"
        : `Attendance_${rangeLabel(attendanceMin, attendanceMax)}`;

    downloadExcel(rows, "Students", buildFilename(name));
  };

  /* ---------------- Filters ---------------- */

  const clearFilters = () => {
    setSearch("");
    setAttendanceMin("");
    setAttendanceMax("");
    setSendTo("both");
    setRangeMenuOpen(false);
    if (jobRole === "campus_manager") setSquad("");
    resetPage();
  };

  const applyRangePreset = (min, max) => {
    setAttendanceMin(min);
    setAttendanceMax(max);
    setRangeMenuOpen(false);
    resetPage();
  };

  const handleRangeInput = (setter) => (event) => {
    const value = event.target.value;

    if (value === "") {
      setter("");
      resetPage();
      return;
    }

    const number = Number(value);
    if (Number.isFinite(number) && number >= 0 && number <= 100) {
      setter(value);
      resetPage();
    }
  };

  const openRowMenu = (event, student) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = 196;

    const opensUp = rect.bottom + menuHeight + 12 > window.innerHeight;
    const top = opensUp ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.max(12, rect.right - menuWidth);

    setRowMenu((current) =>
      current && String(current.student.id) === String(student.id)
        ? null
        : { student, top, left }
    );
  };

  const runRowAction = (action) => {
    const student = rowMenu?.student;
    setRowMenu(null);
    if (!student) return;

    if (action === "subjects") openStudentProfile(student, true);
    if (action === "preview") openEmailPreview(student);
    if (action === "edit") openEmailEditor(student);
    if (action === "send") void handleSend(student);
  };

  const bulkEligibleCount = bulkConfirm
    ? bulkConfirm.list.filter((student) => getRecipients(student).length > 0)
        .length
    : 0;

  const previewRecipients = selectedEmail
    ? (() => {
        const emails = resolveEmails(selectedEmail);
        const parts = [];
        if (sendTo !== "parent")
          parts.push(`Student: ${emails.studentEmail || "missing"}`);
        if (sendTo !== "student")
          parts.push(`Parent: ${emails.parentEmail || "missing"}`);
        return parts;
      })()
    : [];

  /* ---------------- Render ---------------- */

  return (
    <main className="sp-page">
      {/* Header */}
      <header className="sp-header">
        <div className="sp-title">
          <div className="sp-eyebrow">AESA / Student management</div>
          <h1>Students</h1>

          {jobRole === "mentor" && assignedSquad && (
            <p>
              Assigned squad <strong>{assignedSquad}</strong>
            </p>
          )}

          {jobRole === "campus_manager" && (
            <p>
              <strong>Campus Manager</strong>
              <span className="sp-dot">·</span>
              {squad ? `Viewing squad ${squad}` : "Viewing all squads"}
            </p>
          )}
        </div>
      </header>

      {error && (
        <div className="sp-alert sp-alert-error" role="alert">
          {error}
        </div>
      )}

      {emailFeedback && (
        <div className="sp-alert sp-alert-info" role="status">
          <Mail size={16} />
          <span>{emailFeedback}</span>
          <button
            type="button"
            className="sp-alert-dismiss"
            onClick={() => setEmailFeedback("")}
            aria-label="Dismiss message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <section className="sp-toolbar" aria-label="Student filters">
        <label className="sp-search">
          <Search className="sp-search-icon" size={17} />
          <input
            type="search"
            value={search}
            placeholder="Search students by name, email or student ID..."
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
          />
        </label>

        <div className="sp-filters">
          <label className="sp-field">
            <span className="sp-field-label">Squad</span>
            <span className="sp-select">
              <select
                value={squad}
                disabled={jobRole === "mentor"}
                onChange={(event) => {
                  setSquad(event.target.value);
                  resetPage();
                }}
              >
                <option value="">All squads</option>
                {jobRole === "mentor" && assignedSquad ? (
                  <option value={assignedSquad}>Squad {assignedSquad}</option>
                ) : (
                  squads.map((availableSquad) => (
                    <option
                      key={String(availableSquad)}
                      value={String(availableSquad)}
                    >
                      Squad {availableSquad}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={16} className="sp-select-icon" />
            </span>
          </label>

          <div className="sp-field sp-range">
            <span className="sp-field-label">Attendance</span>
            <button
              type="button"
              className={`sp-range-trigger ${rangeInvalid ? "is-invalid" : ""}`}
              onClick={() => setRangeMenuOpen((open) => !open)}
              aria-expanded={rangeMenuOpen}
            >
              <span>{rangeLabel(attendanceMin, attendanceMax)}</span>
              <ChevronDown
                size={16}
                className={rangeMenuOpen ? "sp-rotate" : ""}
              />
            </button>

            {rangeMenuOpen && (
              <>
                <div
                  className="sp-backdrop"
                  onClick={() => setRangeMenuOpen(false)}
                />
                <div className="sp-range-menu">
                  <button
                    type="button"
                    onClick={() => applyRangePreset("", "")}
                  >
                    All attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRangePreset("0", String(BELOW_75_MAX))}
                  >
                    Below 75%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRangePreset("75", "100")}
                  >
                    75% and above
                  </button>

                  <div className="sp-range-custom">
                    <span>Custom</span>
                    <div className="sp-range-inputs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        aria-label="Minimum attendance"
                        value={attendanceMin}
                        onChange={handleRangeInput(setAttendanceMin)}
                      />
                      <em>to</em>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="100"
                        aria-label="Maximum attendance"
                        value={attendanceMax}
                        onChange={handleRangeInput(setAttendanceMax)}
                      />
                      <em>%</em>
                    </div>
                    {rangeInvalid && (
                      <p className="sp-range-error">
                        Minimum is higher than maximum.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <label className="sp-field">
            <span className="sp-field-label">Send to</span>
            <span className="sp-select">
              <select
                value={sendTo}
                onChange={(event) => setSendTo(event.target.value)}
              >
                {Object.entries(SEND_TO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="sp-select-icon" />
            </span>
          </label>
        </div>

        <div className="sp-actions">
          <button
            type="button"
            className="sp-btn sp-btn-primary"
            onClick={() => openBulkConfirm("selected")}
            disabled={loading || selectedStudents.length === 0}
          >
            <Send size={15} />
            <span>Send selected</span>
            <span className="sp-pill">{selectedStudents.length}</span>
          </button>

          <button
            type="button"
            className="sp-btn sp-btn-danger"
            onClick={() => openBulkConfirm("below75")}
            disabled={loading || below75Students.length === 0}
          >
            <MailWarning size={15} />
            <span>Send all below 75%</span>
            <span className="sp-pill">{below75Students.length}</span>
          </button>

          <button
            type="button"
            className="sp-btn"
            onClick={() => setShowTemplateModal(true)}
          >
            <PencilLine size={15} />
            <span>Email template</span>
          </button>

          <button
            type="button"
            className="sp-btn"
            onClick={handleDownload}
            disabled={loading}
          >
            <Download size={15} />
            <span>
              {selectedStudents.length > 0
                ? `Download selected (${selectedStudents.length})`
                : "Download students"}
            </span>
          </button>
        </div>

        <div className="sp-toolbar-foot">
          <span className="sp-found">
            {loading
              ? "Loading students..."
              : `${filteredStudents.length} student${
                  filteredStudents.length === 1 ? "" : "s"
                } found`}
          </span>
          <button type="button" className="sp-link" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </section>

      {/* Directory */}
      <section className="sp-list">
        <div className="sp-list-head">
          <div>
            <h2>Students</h2>
            <p>Review attendance and parent communication status.</p>
          </div>
        </div>

        {selectedStudents.length > 0 && (
          <div className="sp-selection-bar" role="status">
            <strong>{selectedStudents.length} selected</strong>
            {selectedStudents.length < filteredStudents.length && (
              <button type="button" className="sp-link" onClick={selectAllFiltered}>
                Select all {filteredStudents.length} results
              </button>
            )}
            <button type="button" className="sp-link" onClick={clearSelection}>
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <div className="sp-loading">
            <SkeletonLoading type="students" rows={7} />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-icon">
              <Search size={24} />
            </div>
            <h3>No students found</h3>
            <p>Try changing your search or filter criteria.</p>
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="sp-table-shell">
              <div className="sp-table-scroll">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th className="sp-col-check">
                        <input
                          type="checkbox"
                          className="sp-check"
                          aria-label="Select all students on this page"
                          checked={allOnPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someOnPageSelected;
                          }}
                          onChange={togglePage}
                        />
                      </th>
                      <th>Student</th>
                      <th>Student email</th>
                      <th>Squad</th>
                      <th>Attendance</th>
                      <th>Parent email</th>
                      <th className="sp-col-actions">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedStudents.map((student) => {
                      const emails = resolveEmails(student);
                      const attendance = Number(student.attendance) || 0;
                      const isSending = sendingIds.includes(student.id);
                      const status = getAttendanceStatus(attendance);
                      const isChecked = selectedIds.has(String(student.id));

                      const rowClass = [
                        attendance < 75 ? "sp-row-below" : "",
                        isChecked ? "sp-row-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <tr key={student.id} className={rowClass}>
                          <td className="sp-col-check">
                            <input
                              type="checkbox"
                              className="sp-check"
                              aria-label={`Select ${student.name || "student"}`}
                              checked={isChecked}
                              onChange={() => toggleStudent(student.id)}
                            />
                          </td>

                          <td>
                            <span
                              type="button"
                              className="sp-name-btn"
                            >
                              <span>{student.name || "Unnamed student"}</span>
                            </span>
                          </td>

                          <td className="sp-email">
                            {emails.studentEmail || (
                              <span className="sp-missing">Not provided</span>
                            )}
                          </td>

                          <td>
                            <span className="sp-squad">
                              {student.squad || "—"}
                            </span>
                          </td>

                          <td>
                            <div className="sp-att">
                              <span
                                className={`sp-att-badge sp-att-${status.toLowerCase()}`}
                              >
                                {attendance.toFixed(2)}%
                              </span>
                            </div>
                          </td>

                          <td className="sp-email">
                            {emails.parentEmail || (
                              <span className="sp-missing sp-missing-parent">
                                Parent email missing
                              </span>
                            )}
                          </td>

                          <td className="sp-col-actions">
                            <button
                              type="button"
                              className="sp-more"
                              onClick={(event) => openRowMenu(event, student)}
                              disabled={isSending}
                              aria-haspopup="menu"
                              aria-label={`Actions for ${student.name || "student"}`}
                            >
                              {isSending ? (
                                <span className="sp-sending">Sending…</span>
                              ) : (
                                <MoreHorizontal size={18} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sp-pagination">
              <span className="sp-pagination-count">
                Showing{" "}
                <strong>
                  {(safeCurrentPage - 1) * studentsPerPage + 1}
                  {"–"}
                  {Math.min(
                    safeCurrentPage * studentsPerPage,
                    filteredStudents.length
                  )}
                </strong>{" "}
                of <strong>{filteredStudents.length}</strong>
              </span>

              <div className="sp-pagination-controls">
                <label className="sp-per-page">
                  <span>Per page</span>
                  <select
                    value={studentsPerPage}
                    onChange={(event) => {
                      setStudentsPerPage(Number(event.target.value));
                      resetPage();
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </label>

                <div className="sp-pagination-buttons">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(safeCurrentPage - 1)}
                  >
                    Previous
                  </button>

                  {pageButtons.map((page, index) => {
                    const previous = pageButtons[index - 1];
                    const showGap = previous && page - previous > 1;

                    return (
                      <span className="sp-page-wrap" key={page}>
                        {showGap && <span className="sp-page-gap">…</span>}
                        <button
                          type="button"
                          className={page === safeCurrentPage ? "is-active" : ""}
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
        )}
      </section>

      {/* Row action menu */}
      {rowMenu && (
        <>
          <div className="sp-backdrop" onClick={() => setRowMenu(null)} />
          <div
            className="sp-menu"
            role="menu"
            style={{ top: rowMenu.top, left: rowMenu.left }}
          >
            <div className="sp-menu-title">{rowMenu.student.name}</div>
            <button type="button" role="menuitem" onClick={() => runRowAction("subjects")}>
              <BookOpen size={15} />
              View subjects
            </button>
            <button type="button" role="menuitem" onClick={() => runRowAction("preview")}>
              <Eye size={15} />
              Preview email
            </button>
            <button type="button" role="menuitem" onClick={() => runRowAction("edit")}>
              <Pencil size={15} />
              Edit email
            </button>
            <button
              type="button"
              role="menuitem"
              className="sp-menu-primary"
              onClick={() => runRowAction("send")}
            >
              <Send size={15} />
              Send email
            </button>
          </div>
        </>
      )}

      {/* Student profile modal */}
      {selectedStudent && (
        <div className="sp-overlay" onClick={closeStudentProfile}>
          <section
            className="sp-modal sp-profile-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Student profile"
          >
            <button
              type="button"
              className="sp-modal-close sp-modal-close-abs"
              onClick={closeStudentProfile}
              aria-label="Close profile"
            >
              <X size={18} />
            </button>

            <div className="sp-profile-hero">
              <div className="sp-avatar">
                {(selectedStudent.name || "?").charAt(0).toUpperCase()}
              </div>

              <div className="sp-identity">
                <span>Student profile</span>
                <h2>{selectedStudent.name || "Unnamed student"}</h2>
                <p>
                  Squad {selectedStudent.squad || "—"}
                </p>
              </div>
            </div>

            <div className="sp-profile-section">
              <div className="sp-section-heading">
                <h3>Personal information</h3>
              </div>

              <div className="sp-profile-grid">
                <div>
                  <span>Student email</span>
                  <strong>{selectedStudent.email || "Not provided"}</strong>
                </div>
                <div>
                  <span>Student phone</span>
                  <strong>{selectedStudent.phone || "Not provided"}</strong>
                </div>
                <div>
                  <span>Parent phone</span>
                  <strong>{selectedStudent.parent_phone || "Not provided"}</strong>
                </div>
                <div>
                  <span>Parent email</span>
                  <strong>{selectedStudent.parent_email || "Not provided"}</strong>
                </div>
              </div>
            </div>

            <div className="sp-profile-section">
              <div className="sp-section-heading sp-section-heading-row">
                <h3>Attendance calculation</h3>

                <button
                  type="button"
                  className={`sp-toggle ${showOverallAttendance ? "on" : ""}`}
                  role="switch"
                  aria-checked={showOverallAttendance}
                  onClick={() => setShowOverallAttendance((value) => !value)}
                >
                  <span className="sp-toggle-track">
                    <span className="sp-toggle-thumb" />
                  </span>
                  <span>{showOverallAttendance ? "Overall" : "Without GH"}</span>
                </button>
              </div>

              {showOverallAttendance ? (
                <div className="sp-result sp-result-main">
                  <span>Overall attendance</span>
                  <strong>
                    {Number(selectedStudent.attendance || 0).toFixed(2)}%
                  </strong>
                </div>
              ) : (
                <div className="sp-result">
                  <span>Attendance without Growth Hour</span>
                  <strong>
                    {(conductedSessions > 0
                      ? withoutGrowthHourAttendance
                      : 0
                    ).toFixed(2)}
                    %
                  </strong>

                  <div className="sp-count-grid">
                    <div>
                      <span>Present sessions</span>
                      <strong>{presentSessions}</strong>
                    </div>
                    <div>
                      <span>Conducted sessions</span>
                      <strong>{conductedSessions}</strong>
                    </div>
                  </div>

                  {conductedSessions === 0 && (
                    <p>No conducted sessions available.</p>
                  )}
                </div>
              )}
            </div>

            {showSubjects && (
              <div className="sp-profile-section">
                <div className="sp-section-heading">
                  <h3>Subject-wise attendance</h3>
                </div>

                {subjectWiseAttendance.length === 0 ? (
                  <div className="sp-subject-empty">
                    No subject attendance data available.
                  </div>
                ) : (
                  <div className="sp-subject-wrap">
                    <table className="sp-subject-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Attended</th>
                          <th>Conducted</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectWiseAttendance.map((subject) => {
                          const conducted =
                            Number(subject.conductedSessions) || 0;
                          const present = Number(subject.presentSessions) || 0;
                          const percentage =
                            conducted > 0 ? (present / conducted) * 100 : 0;

                          return (
                            <tr key={subject.subjectId || subject.subjectName}>
                              <td>
                                <strong>
                                  {getSubjectShortName(subject.subjectName)}
                                </strong>
                                <span>{subject.subjectName}</span>
                              </td>
                              <td>{present}</td>
                              <td>{conducted}</td>
                              <td>
                                <span
                                  className={`sp-subject-pct ${
                                    percentage >= 75
                                      ? "good"
                                      : percentage >= 65
                                        ? "warning"
                                        : "critical"
                                  }`}
                                >
                                  {percentage.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Template modal */}
      {showTemplateModal && (
        <div className="sp-overlay" onClick={() => setShowTemplateModal(false)}>
          <section
            className="sp-modal sp-email-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit email template"
          >
            <div className="sp-modal-header">
              <div>
                <span className="sp-kicker">Email template</span>
                <h2>Edit email template</h2>
              </div>
              <button
                type="button"
                className="sp-modal-close"
                onClick={() => setShowTemplateModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sp-template-help">
              <p>Apply this template to all loaded students.</p>
              <span>
                Variables: <code>{"{{studentName}}"}</code>{" "}
                <code>{"{{attendance}}"}</code> <code>{"{{mentorName}}"}</code>{" "}
                <code>{"{{mentorEmail}}"}</code>
              </span>
            </div>

            <div className="sp-form">
              <label htmlFor="sp-template-subject">Subject</label>
              <input
                id="sp-template-subject"
                className="sp-input"
                value={templateSubject}
                onChange={(event) => setTemplateSubject(event.target.value)}
              />

              <label htmlFor="sp-template-message">Message</label>
              <textarea
                id="sp-template-message"
                className="sp-textarea sp-textarea-lg"
                value={templateMessage}
                onChange={(event) => setTemplateMessage(event.target.value)}
              />
            </div>

            <div className="sp-modal-actions">
              <button
                type="button"
                className="sp-cancel"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sp-confirm"
                onClick={handleSaveTemplate}
              >
                Save template
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Email preview / edit modal */}
      {selectedEmail && emailModalMode && (
        <div className="sp-overlay" onClick={closeEmailModal}>
          <section
            className="sp-modal sp-email-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Attendance alert email"
          >
            <div className="sp-modal-header">
              <div>
                <span className="sp-kicker">
                  {emailModalMode === "edit" ? "Edit email" : "Email preview"}
                </span>
                <h2>Attendance alert</h2>
              </div>
              <button
                type="button"
                className="sp-modal-close"
                onClick={closeEmailModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sp-email-details">
              <div>
                <span>To</span>
                {previewRecipients.map((line) => (
                  <strong key={line}>{line}</strong>
                ))}
              </div>
              <div>
                <span>Student</span>
                <strong>{selectedEmail.name}</strong>
              </div>
              <div>
                <span>Subject</span>
                {emailModalMode === "edit" ? (
                  <input
                    className="sp-input"
                    value={editSubject}
                    onChange={(event) => setEditSubject(event.target.value)}
                  />
                ) : (
                  <strong>{selectedEmail.subject}</strong>
                )}
              </div>
            </div>

            <div className="sp-email-message">
              {emailModalMode === "edit" ? (
                <textarea
                  className="sp-textarea"
                  value={editMessage}
                  onChange={(event) => setEditMessage(event.target.value)}
                />
              ) : (
                <p>{selectedEmail.message}</p>
              )}
            </div>

            <div className="sp-modal-actions">
              <button type="button" className="sp-cancel" onClick={closeEmailModal}>
                Close
              </button>

              {emailModalMode === "edit" ? (
                <button type="button" className="sp-confirm" onClick={handleSaveEdit}>
                  Save changes
                </button>
              ) : (
                <button
                  type="button"
                  className="sp-confirm"
                  onClick={() => handleSend(selectedEmail)}
                  disabled={sendingIds.includes(selectedEmail.id)}
                >
                  {sendingIds.includes(selectedEmail.id)
                    ? "Sending…"
                    : "Send email"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Bulk confirm modal */}
      {bulkConfirm && (
        <div className="sp-overlay" onClick={() => setBulkConfirm(null)}>
          <section
            className="sp-modal sp-email-modal sp-confirm-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm bulk email"
          >
            <div className="sp-modal-header">
              <div>
                <span className="sp-kicker">Bulk email</span>
                <h2>
                  {bulkConfirm.kind === "selected"
                    ? "Send to selected students?"
                    : "Send all below 75%?"}
                </h2>
              </div>
              <button
                type="button"
                className="sp-modal-close"
                onClick={() => setBulkConfirm(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sp-bulk-body">
              <div className="sp-bulk-icon">
                <MailWarning size={20} />
              </div>
              <p>
                {bulkConfirm.kind === "selected"
                  ? "This sends the attendance alert to every student you selected."
                  : "This sends attendance alerts only to students below 75%. Students at 75% and above are excluded."}{" "}
                Recipients: <strong>{SEND_TO_LABELS[sendTo].toLowerCase()}</strong>.
              </p>
              <strong>
                {bulkEligibleCount} of {bulkConfirm.list.length} students have a
                matching email
              </strong>
            </div>

            <div className="sp-modal-actions">
              <button
                type="button"
                className="sp-cancel"
                onClick={() => setBulkConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sp-confirm"
                onClick={handleConfirmBulk}
                disabled={sendingIds.length > 0 || bulkEligibleCount === 0}
              >
                <MailWarning size={15} />
                {sendingIds.length > 0 ? "Sending…" : "Confirm send"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default StudentPage;