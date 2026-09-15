import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  getMentorEmailAlerts,
  getAvailableSquads,
} from "../../api/mentor";
import * as XLSX from "xlsx";
import "./EmailAutomation.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getAttendanceStatus = (attendance) => {
  if (Number(attendance) >= 75) return "Good";
  if (Number(attendance) >= 65) return "Warning";
  return "Critical";
};

const generateEmail = (student) => {
  const status = getAttendanceStatus(student.attendance);
  const isCritical = status === "Critical";

  return {
    ...student,
    status,
    subject: isCritical
      ? "Attendance Alert - Immediate Attention Required"
      : "Attendance Warning",
    message: isCritical
      ? `Your current attendance is ${student.attendance}%. Your attendance is below the required level. Please take immediate steps to improve your attendance.`
      : `Your current attendance is ${student.attendance}%. Please make sure to attend your upcoming classes regularly and maintain the required attendance percentage.`,
  };
};

function EmailAutomation() {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [mentorSquad, setMentorSquad] = useState("");
  const [selectedSquad, setSelectedSquad] = useState("");
  const [squads, setSquads] = useState([]);
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [mentorName, setMentorName] = useState("Mentor");
  const [mentorEmail, setMentorEmail] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [sendingIds, setSendingIds] = useState([]);
  const [sendError, setSendError] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSubject, setTemplateSubject] = useState(
    "Attendance Warning - Low Attendance"
  );
  const [templateMessage, setTemplateMessage] = useState(`Dear {{studentName}},

Your current attendance is {{attendance}}%.

The required attendance percentage is 75%.
Please make sure to attend your upcoming classes regularly.

Regards,
{{mentorName}}
AESA`);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoadingStudents(true);
        setLoadError("");

        const result =
          await getMentorEmailAlerts();

        setJobRole(
          result.jobRole || "mentor"
        );

        setMentorSquad(
          result.squad || ""
        );

        setStudents(
          (result.students || []).map(
            generateEmail
          )
        );

        if (result.jobRole === "mentor") {
          setSelectedSquad(
            result.squad || ""
          );
        } else {
          setSelectedSquad("");
        }
      } catch (error) {
        console.error(
          "Failed to fetch email alert data:",
          error
        );

        setLoadError(
          error.message ||
          "Failed to load students."
        );
      } finally {
        setLoadingStudents(false);
      }
    };

    void fetchAttendanceData();
  }, []);

  // useEffect(() => {
  //   const updateSelectedSquad = (event) => {
  //     setSelectedSquad(event.detail || "");
  //   };
  //   const handleStorageChange = (event) => {
  //     if (event.key === "selectedSquad") setSelectedSquad(event.newValue || "");
  //   };

  //   window.addEventListener("selectedSquadChange", updateSelectedSquad);
  //   window.addEventListener("storage", handleStorageChange);
  //   return () => {
  //     window.removeEventListener("selectedSquadChange", updateSelectedSquad);
  //     window.removeEventListener("storage", handleStorageChange);
  //   };
  // }, []);

  useEffect(() => {
    const getMentor = async () => {
      if (!supabase) return;
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Failed to get mentor:", error.message);
        return;
      }
      if (user) {
        setMentorName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Mentor"
        );
        setMentorEmail(user.email || "");
      }
    };

    void getMentor();
  }, []);
  useEffect(() => {
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
      } catch (error) {
        console.error(
          "Failed to load squads:",
          error
        );
      }
    };

    void loadSquads();
  }, [jobRole]);

  const squadStudents = students.filter(
    (student) => {
      // Mentor:
      // Backend already restricted the data
      // to the mentor's assigned squad.
      if (jobRole === "mentor") {
        return true;
      }

      // Campus Manager:
      // Allow local squad filtering.
      if (jobRole === "campus_manager") {
        return (
          !selectedSquad ||
          String(student.squad).trim() ===
          String(selectedSquad).trim()
        );
      }

      return true;
    }
  );

  const filteredStudents = squadStudents.filter((student) => {
    const attendance = Number(student.attendance || 0);
    if (attendanceFilter === "below75") return attendance < 75;
    if (attendanceFilter === "above75") return attendance >= 75;
    return true;
  });

  const eligibleFilteredStudents = filteredStudents.filter(
    (student) => Number(student.attendance) < 75
  );
  const below75Count = squadStudents.filter(
    (student) => Number(student.attendance) < 75
  ).length;
  const atOrAbove75Count = squadStudents.filter(
    (student) => Number(student.attendance) >= 75
  ).length;
  const isSending = sendingIds.length > 0;

  const replaceTemplateVariables = (text, student) => text
    .replaceAll("{{studentName}}", student.name || "")
    .replaceAll("{{attendance}}", String(student.attendance ?? ""))
    .replaceAll("{{mentorName}}", mentorName || "Mentor")
    .replaceAll("{{mentorEmail}}", mentorEmail || "");

  const sendEmail = async (student, { bulk = false } = {}) => {
    if (bulk && Number(student.attendance) >= 75) {
      throw new Error(
        "Automatic attendance alerts are only available for students below 75%."
      );
    }

    if (!student.parentEmail) {
      throw new Error(`Parent email is missing for ${student.name}.`);
    }

    const response = await fetch(`${API_URL}/api/email-automation/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentIds: [student.id],

        // automatic = bulk attendance alert
        // individual = manually sent email
        sendType: bulk ? "automatic" : "individual",

        mentorName,
        mentorEmail,

        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        parentEmail: student.parentEmail,
        attendancePercentage: student.attendance,

        subject: student.subject,
        message: student.message,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message || result?.error || "Email sending failed"
      );
    }

    return result;
  };

  const handleSend = async (student) => {
    setSendingIds((current) => [...current, student.id]);
    setSendError("");
    try {
      await sendEmail(student);
      setStudents((current) => current.filter((item) => item.id !== student.id));
      setSelectedEmail(null);
      setModalMode(null);
      alert(`Email sent successfully to ${student.parentEmail}`);
    } catch (error) {
      setSendError(error.message);
      alert(`Failed to send email: ${error.message}`);
    } finally {
      setSendingIds((current) => current.filter((id) => id !== student.id));
    }
  };

  const handleSendAllFiltered = async () => {
    const eligibleStudents = filteredStudents.filter(
      (student) => Number(student.attendance) < 75
    );

    if (eligibleStudents.length === 0) {
      setSendError("Automatic attendance alerts are only available for students below 75%.");
      return;
    }
    if (!window.confirm(`Send attendance alerts to ${eligibleStudents.length} students below 75%?`)) {
      return;
    }

    setSendError("");
    setSendingIds(eligibleStudents.map((student) => student.id));
    let successCount = 0;
    const failures = [];
    const successfulIds = [];

    for (const student of eligibleStudents) {
      try {
        await sendEmail(student, { bulk: true });
        successCount += 1;
        successfulIds.push(student.id);
      } catch (error) {
        failures.push(`${student.name}: ${error.message}`);
      }
    }

    setStudents((current) => current.filter((student) => !successfulIds.includes(student.id)));
    setSendingIds([]);
    alert(`${successCount} emails sent successfully. ${failures.length} failed.`);
    if (failures.length > 0) setSendError(failures.join(" | "));
  };

  const handlePreview = (student) => {
    setSelectedEmail(student);
    setModalMode("preview");
  };

  const handleEdit = (student) => {
    setSelectedEmail(student);
    setEditSubject(student.subject);
    setEditMessage(student.message);
    setModalMode("edit");
  };

  const handleSaveEdit = () => {
    const updated = { ...selectedEmail, subject: editSubject, message: editMessage };
    setStudents((current) => current.map((student) => (
      student.id === updated.id ? updated : student
    )));
    setSelectedEmail(updated);
    setModalMode("preview");
  };

  const handleSaveTemplate = () => {
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        subject: replaceTemplateVariables(templateSubject, student),
        message: replaceTemplateVariables(templateMessage, student),
      }))
    );

    setShowTemplateModal(false);

    alert(
      "Email template saved. You can now send only the students below 75%."
    );
  };

  const handleDownloadBelow75 = () => {
    const below75Students = filteredStudents.filter(
      (student) => Number(student.attendance) < 75
    );

    if (below75Students.length === 0) {
      alert("No students below 75% to download.");
      return;
    }

    const worksheetData = below75Students.map((student) => ({
      "Student ID": student.id,
      "Student Name": student.name,
      "Student Email": student.email || "",
      "Parent Email": student.parentEmail || "",
      Squad: student.squad || "",
      "Attendance Percentage": Number(student.attendance),
      "Attendance Status": Number(student.attendance) < 65 ? "Critical" : "Warning",
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Below 75% Attendance");
    XLSX.writeFile(
      workbook,
      `AESA_Below_75_Attendance_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <section className="email-automation-page">
      <div className="email-page-header">
        <div>
          <div className="page-label">COMMUNICATIONS</div>
          <h1>Email Automation</h1>
          <p>
            {jobRole === "campus_manager"
              ? selectedSquad
                ? `Attendance alerts for Squad ${selectedSquad}.`
                : "Attendance alerts for all squads."
              : `Attendance alerts for Squad ${mentorSquad || "your squad"}.`}
          </p>
        </div>
        <div className="date-section">
          <label htmlFor="attendance-date">Attendance Date</label>
          <input id="attendance-date" type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} />
        </div>
      </div>

      <div className="email-summary">
        <div className="email-summary-card"><div className="summary-icon">👥</div><div><p>Students Shown</p><h2>{filteredStudents.length}</h2></div></div>
        <div className="email-summary-card"><div className="summary-icon">⚠️</div><div><p>Below 75%</p><h2>{below75Count}</h2></div></div>
        <div className="email-summary-card"><div className="summary-icon">✓</div><div><p>75% and Above</p><h2>{atOrAbove75Count}</h2></div></div>
      </div>

      <div className="communication-section">
        <div className="communication-header">
          <div><h2>Attendance Alerts</h2><p>Review personalized messages and send eligible alerts.</p></div>
          <div className="attendance-filter">

            <label htmlFor="attendance-filter">Attendance Range</label>
            <select id="attendance-filter" value={attendanceFilter} onChange={(event) => setAttendanceFilter(event.target.value)}>
              <option value="all">All Students</option>
              <option value="below75">Below 75%</option>
              <option value="above75">75% and Above</option>
            </select>
          </div>
        </div>
        <div className="communication-actions">
          <button type="button" className="template-button" onClick={() => setShowTemplateModal(true)}>Edit Email Template</button>
          <button type="button" className="template-button" onClick={handleDownloadBelow75}>Download Below 75%</button>
          <button type="button" className="send-filtered-button" onClick={handleSendAllFiltered} disabled={isSending || eligibleFilteredStudents.length === 0}>{isSending ? "Sending Emails..." : "Send All Filtered Emails"}</button>
        </div>
        {filteredStudents.length > 0 && eligibleFilteredStudents.length === 0 && <p className="filter-message">Automatic attendance alerts are only available for students below 75%.</p>}
      </div>

      {sendError && <div className="email-send-error">{sendError}</div>}

      <div className="email-list">
        {loadingStudents ? <div className="empty-email"><h3>Loading students...</h3><p>Fetching student and parent details.</p></div> : loadError ? <div className="empty-email"><h3>Unable to load students</h3><p>{loadError}</p></div> : filteredStudents.length === 0 ? <div className="empty-email"><h3>No students match this attendance range.</h3><p>No students currently require attendance alerts in this view.</p></div> : filteredStudents.map((student) => (
          <div className="email-card" key={student.id}>
            <div className="student-email-info">
              <div className="student-avatar">
                {(student.name || "?")
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="student-details">
                <h3>{student.name}</h3>
                <p>{student.email || "Student email missing"}</p>
                <p>{student.parentEmail || "Parent email missing"}</p>
              </div>
            </div>

            <div className="attendance-info">
              <span>Attendance</span>
              <strong>{student.attendance}%</strong>
            </div>

            <div className={`email-status ${student.status.toLowerCase()}`}>
              {student.status}
            </div>

            <div className="email-subject">
              <span>Subject</span>
              <p>{student.subject}</p>
              <span>Message</span>
              <p>{student.message}</p>
            </div>

            <div className="email-actions">
              <button
                type="button"
                className="preview-button"
                onClick={() => handlePreview(student)}
              >
                Preview
              </button>

              <button
                type="button"
                className="edit-button"
                onClick={() => handleEdit(student)}
                disabled={sendingIds.includes(student.id)}
              >
                Edit Email
              </button>

              <button
                type="button"
                className="send-button"
                onClick={() => handleSend(student)}
                disabled={sendingIds.includes(student.id)}
                title="Send this student's email"
              >
                {sendingIds.includes(student.id)
                  ? "Sending..."
                  : "Send Email"}
              </button>

              <span className="email-eligibility">
                {Number(student.attendance) < 75
                  ? "Eligible to send"
                  : "Not eligible: attendance is 75% or above"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showTemplateModal && <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}><div className="email-modal template-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><div className="page-label">EMAIL TEMPLATE</div><h2>Edit Email Template</h2></div><button type="button" className="close-button" onClick={() => setShowTemplateModal(false)}>×</button></div>
        <div className="template-help"><p>Apply this template to all loaded students.</p><p>Variables: <strong>{"{{studentName}}"}</strong> <strong>{"{{attendance}}"}</strong> <strong>{"{{mentorName}}"}</strong> <strong>{"{{mentorEmail}}"}</strong></p></div>
        <div className="template-form"><label htmlFor="template-subject">Subject</label><input id="template-subject" className="edit-input" value={templateSubject} onChange={(event) => setTemplateSubject(event.target.value)} /><label htmlFor="template-message">Message</label><textarea id="template-message" className="edit-textarea template-textarea" value={templateMessage} onChange={(event) => setTemplateMessage(event.target.value)} /></div>
        <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setShowTemplateModal(false)}>Cancel</button><button type="button" className="modal-send-button" onClick={handleSaveTemplate}>Save Template</button></div>
      </div></div>}

      {selectedEmail && modalMode && <div className="modal-overlay" onClick={() => { setSelectedEmail(null); setModalMode(null); }}><div className="email-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><div className="page-label">{modalMode === "edit" ? "EDIT EMAIL" : "EMAIL PREVIEW"}</div><h2>Attendance Alert</h2></div><button type="button" className="close-button" onClick={() => { setSelectedEmail(null); setModalMode(null); }}>×</button></div>
        <div className="email-details"><div><span>To</span><p>{selectedEmail.parentEmail || "Parent email missing"}</p></div><div><span>Student</span><p>{selectedEmail.name}</p></div><div><span>Subject</span>{modalMode === "edit" ? <input className="edit-input" value={editSubject} onChange={(event) => setEditSubject(event.target.value)} /> : <p>{selectedEmail.subject}</p>}</div></div>
        <div className="email-message">{modalMode === "edit" ? <textarea className="edit-textarea" value={editMessage} onChange={(event) => setEditMessage(event.target.value)} /> : <p>{selectedEmail.message}</p>}</div>
        <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => { setSelectedEmail(null); setModalMode(null); }}>Close</button>{modalMode === "edit" ? <button type="button" className="modal-send-button" onClick={handleSaveEdit}>Save Changes</button> : <button type="button" className="modal-send-button" onClick={() => handleSend(selectedEmail)} disabled={isSending}>{Number(selectedEmail.attendance) >= 75 ? "Not Eligible" : "Send Email"}</button>}</div>
      </div></div>}
    </section>
  );
}

export default EmailAutomation;
