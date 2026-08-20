import { useEffect, useState } from "react";
import "./EmailAutomation.css";

/*
  TEMPORARY ATTENDANCE DATA

  Later this data will come from:
  Excel → Backend → Database/API → Email Automation
*/
const attendanceData = [
  {
    id: "STU001",
    name: "Rahul Kumar",
    email: "rahul@student.edu",
    attendance: 62,
  },
  {
    id: "STU002",
    name: "Priya Sharma",
    email: "priya@student.edu",
    attendance: 68,
  },
  {
    id: "STU003",
    name: "Arun Kumar",
    email: "arun@student.edu",
    attendance: 72,
  },
  {
    id: "STU004",
    name: "Karthik Raj",
    email: "karthik@student.edu",
    attendance: 58,
  },
  {
    id: "STU005",
    name: "Divya Sri",
    email: "divya@student.edu",
    attendance: 84,
  },
];

/*
  Attendance rules
*/
const getAttendanceStatus = (attendance) => {
  if (attendance >= 75) {
    return "Good";
  }

  if (attendance >= 65) {
    return "Warning";
  }

  return "Critical";
};

/*
  Generate email content
*/
const generateEmail = (student) => {
  const status = getAttendanceStatus(student.attendance);

  let subject = "";
  let message = "";

  if (status === "Critical") {
    subject = "Attendance Alert - Immediate Attention Required";

    message = `Your current attendance is ${student.attendance}%. Your attendance is below the required level. Please take immediate steps to improve your attendance.`;
  } else {
    subject = "Attendance Warning";

    message = `Your current attendance is ${student.attendance}%. Please make sure to attend your upcoming classes regularly and maintain the required attendance percentage.`;
  }

  return {
    ...student,
    status,
    subject,
    message,
  };
};

function EmailAutomation() {
  /*
    Today's date
  */
  const today = new Date().toISOString().split("T")[0];

  /*
    Selected attendance date
  */
  const [attendanceDate, setAttendanceDate] = useState(today);

  /*
    Email drafts
  */
  const [emailDrafts, setEmailDrafts] = useState([]);

  /*
    Communication method

    {
      STU001: "automatic",
      STU002: "draft"
    }
  */
  const [communicationMode, setCommunicationMode] = useState({});

  const [sentEmails, setSentEmails] = useState([]);
  const [showDraftOnly, setShowDraftOnly] = useState(false);

  const [reviewedDrafts, setReviewedDrafts] = useState({});

  /*
    Currently selected email
  */
  const [selectedEmail, setSelectedEmail] = useState(null);

  /*
    Preview / Edit modal
  */
  const [modalMode, setModalMode] = useState(null);

  /*
    Editable subject
  */
  const [editSubject, setEditSubject] = useState("");

  /*
    Editable message
  */
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    const storedHistory = localStorage.getItem(
      "communicationHistory"
    );

    if (storedHistory) {
      setSentEmails(JSON.parse(storedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "communicationHistory",
      JSON.stringify(sentEmails)
    );
  }, [sentEmails]);

  /*
    Generate drafts
  */
  const handleGenerateDrafts = () => {
    const studentsNeedingEmail = attendanceData.filter(
      (student) => student.attendance < 75
    );

    const generatedEmails = studentsNeedingEmail.map((student) =>
      generateEmail(student)
    );

    setEmailDrafts(generatedEmails);

    /*
      By default every generated email is set
      to Automatic.

      Mentor can change individual emails
      to Draft later.
    */
    const defaultCommunication = {};

    generatedEmails.forEach((email) => {
      defaultCommunication[email.id] = "automatic";
    });

    setCommunicationMode(defaultCommunication);

    setSelectedEmail(null);
    setModalMode(null);
  };

  /*
    Change communication method
    for one student
  */
  const handleCommunicationChange = (studentId, mode) => {
    setCommunicationMode((currentModes) => ({
      ...currentModes,
      [studentId]: mode,
    }));
  };

  /*
    Select all as Automatic
  */
  const handleSelectAllAutomatic = () => {
    const automaticModes = {};

    emailDrafts.forEach((email) => {
      automaticModes[email.id] = "automatic";
    });

    setCommunicationMode(automaticModes);
  };
  /*
    Select all as Draft
  */
  const handleSelectAllDraft = () => {
    const draftModes = {};

    emailDrafts.forEach((email) => {
      draftModes[email.id] = "draft";
    });

    setCommunicationMode(draftModes);
  };

  const handleSendAutomaticEmails = () => {
    const automaticEmails = emailDrafts.filter(
      (email) => communicationMode[email.id] === "automatic"
    );

    if (automaticEmails.length === 0) {
      alert("There are no automatic emails to send.");
      return;
    }

    setSentEmails((current) => [
      ...current,
      ...automaticEmails.map((email) => ({
        ...email,
        sentAt: new Date().toLocaleString(),
        communicationType: "automatic",
        sendStatus: "Sent",
      })),
    ]);

    setEmailDrafts((currentEmails) =>
      currentEmails.filter(
        (email) =>
          communicationMode[email.id] !== "automatic"
      )
    );

    setCommunicationMode((currentModes) => {
      const updatedModes = { ...currentModes };

      automaticEmails.forEach((email) => {
        delete updatedModes[email.id];
      });

      return updatedModes;
    });

    alert(
      `${automaticEmails.length} automatic emails sent successfully.`
    );
  };

  const handleReviewDrafts = () => {
    setShowDraftOnly(true);
  };

  const handleSendReviewedDrafts = () => {
    const reviewedEmails = emailDrafts.filter(
      (email) =>
        communicationMode[email.id] === "draft" &&
        reviewedDrafts[email.id]
    );

    if (reviewedEmails.length === 0) {
      alert("There are no reviewed drafts to send.");
      return;
    }

    setSentEmails((current) => [
      ...current,
      ...reviewedEmails.map((email) => ({
        ...email,
        sentAt: new Date().toLocaleString(),
        communicationType: "draft",
        sendStatus: "Sent",
      })),
    ]);
    setEmailDrafts((currentEmails) =>
      currentEmails.filter(
        (email) => !reviewedEmails.some((reviewed) => reviewed.id === email.id)
      )
    );
    setCommunicationMode((currentModes) => {
      const updatedModes = { ...currentModes };

      reviewedEmails.forEach((email) => {
        delete updatedModes[email.id];
      });

      return updatedModes;
    });
    setReviewedDrafts((current) => {
      const updatedReviews = { ...current };

      reviewedEmails.forEach((email) => {
        delete updatedReviews[email.id];
      });

      return updatedReviews;
    });
  };



  /*
    Open Preview
  */
  const handlePreview = (email) => {
    setSelectedEmail(email);
    setModalMode("preview");
  };

  /*
    Open Edit
  */
  const handleEdit = (email) => {
    setSelectedEmail(email);

    setEditSubject(email.subject);
    setEditMessage(email.message);

    setModalMode("edit");
  };

  /*
    Save edited email
  */
  const handleSaveEdit = () => {
    const updatedEmails = emailDrafts.map((email) =>
      email.id === selectedEmail.id
        ? {
          ...email,
          subject: editSubject,
          message: editMessage,
        }
        : email
    );

    setEmailDrafts(updatedEmails);

    const updatedSelectedEmail = updatedEmails.find(
      (email) => email.id === selectedEmail.id
    );

    setSelectedEmail(
      updatedSelectedEmail
    );

    setReviewedDrafts((current) => ({
      ...current,
      [selectedEmail.id]: true,
    }));

    setModalMode("preview");
  };

  /*
    Send email

    For now this only simulates sending.
    Later this will call the backend.
  */
  const handleSend = (id) => {
    const student = emailDrafts.find(
      (email) => email.id === id
    );

    if (!student) return;

    setSentEmails((current) => [
      ...current,
      {
        ...student,
        sentAt: new Date().toLocaleString(),
        communicationType:
          communicationMode[student.id] || "automatic",
        sendStatus: "Sent",
      },
    ]);

    alert(
      `Email sent successfully to ${student.email}`
    );

    setEmailDrafts((currentEmails) =>
      currentEmails.filter(
        (email) => email.id !== id
      )
    );

    setCommunicationMode((currentModes) => {
      const updatedModes = {
        ...currentModes,
      };

      delete updatedModes[id];

      return updatedModes;
    });

    setSelectedEmail(null);
    setModalMode(null);
  };

  /*
    Calculate statistics
  */
  const criticalCount = emailDrafts.filter(
    (email) => email.status === "Critical"
  ).length;

  const warningCount = emailDrafts.filter(
    (email) => email.status === "Warning"
  ).length;

  /*
    Communication statistics
  */
  const automaticCount = emailDrafts.filter(
    (email) => communicationMode[email.id] === "automatic"
  ).length;

  const draftCount = emailDrafts.filter(
    (email) => communicationMode[email.id] === "draft"
  ).length;

  return (
    <section className="email-automation-page">

      {/* =====================================
          HEADER
      ====================================== */}

      <div className="email-page-header">

        <div>
          <div className="page-label">
            COMMUNICATIONS
          </div>

          <h1>Email Automation</h1>

          <p>
            Generate, review and send
            attendance alert emails.
          </p>
        </div>

        {/* DATE */}

        <div className="date-section">

          <label htmlFor="attendance-date">
            Attendance Date
          </label>

          <input
            id="attendance-date"
            type="date"
            value={attendanceDate}
            onChange={(event) =>
              setAttendanceDate(event.target.value)
            }
          />

        </div>

      </div>

      {/* =====================================
          SUMMARY
      ====================================== */}

      <div className="email-summary">

        <div className="email-summary-card">

          <div className="summary-icon">
            👥
          </div>

          <div>
            <p>
              Students Requiring Alerts
            </p>

            <h2>
              {emailDrafts.length}
            </h2>
          </div>

        </div>

        <div className="email-summary-card">

          <div className="summary-icon">
            ⚠️
          </div>

          <div>
            <p>
              Critical Students
            </p>

            <h2>
              {criticalCount}
            </h2>
          </div>

        </div>

        <div className="email-summary-card">

          <div className="summary-icon">
            ✉️
          </div>

          <div>
            <p>
              Warning Students
            </p>

            <h2>
              {warningCount}
            </h2>
          </div>

        </div>

      </div>

      {/* =====================================
          GENERATE SECTION
      ====================================== */}

      <div className="generate-section">

        <div>
          <h2>
            Attendance Alert Emails
          </h2>

          <p>
            Generate emails for students
            below the required attendance.
          </p>
        </div>

        <button
          type="button"
          className="generate-button"
          onClick={handleGenerateDrafts}
        >
          Generate Email Drafts
        </button>

      </div>

      {/* =====================================
          COMMUNICATION CONTROLS
      ====================================== */}

      {emailDrafts.length > 0 && (

        <div className="communication-section">

          <div className="communication-header">

            <div>
              <h2>
                Communication Method
              </h2>

              <p>
                Choose how each attendance
                alert should be handled.
              </p>
            </div>

            <div className="communication-counts">

              <span className="automatic-count">
                Automatic: {automaticCount}
              </span>

              <span className="draft-count">
                Draft: {draftCount}
              </span>

            </div>

          </div>

          <div className="communication-actions">

            <button
              type="button"
              className="select-automatic-button"
              onClick={handleSelectAllAutomatic}
            >
              Select All as Automatic
            </button>

            <button
              type="button"
              className="select-draft-button"
              onClick={handleSelectAllDraft}
            >
              Select All as Draft
            </button>

          </div>

          <div className="automation-actions">

            <button
              type="button"
              className="send-automatic-button"
              onClick={handleSendAutomaticEmails}
            >
              Send Automatic Emails
            </button>

            <button
              type="button"
              className="review-drafts-button"
              onClick={handleReviewDrafts}
            >
              Review Drafts
            </button>

            <button
              type="button"
              className="show-all-button"
              onClick={() => setShowDraftOnly(false)}
            >
              Show All Emails
            </button>

          </div>

        </div>

      )}

      {/* =====================================
          EMAIL LIST
      ====================================== */}

      <div className="email-list">

        {emailDrafts.length === 0 ? (

          <div className="empty-email">

            <h3>
              No email drafts generated
            </h3>

            <p>
              Select the attendance date
              and click "Generate Email
              Drafts".
            </p>

          </div>

        ) : (

          emailDrafts
            .filter((email) => {
              if (!showDraftOnly) return true;

              return communicationMode[email.id] === "draft";
            })
            .map((email) => (

              <div
                className="email-card"
                key={email.id}
              >

                {/* STUDENT */}

                <div className="student-email-info">

                  <div className="student-avatar">
                    {email.name
                      .split(" ")
                      .map(
                        (word) =>
                          word[0]
                      )
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div>

                    <h3>
                      {email.name}
                    </h3>

                    <p>
                      {email.email}
                    </p>

                  </div>

                </div>

                {/* ATTENDANCE */}

                <div className="attendance-info">

                  <span>
                    Attendance
                  </span>

                  <strong>
                    {email.attendance}%
                  </strong>

                </div>

                {/* STATUS */}

                <div
                  className={`email-status ${email.status.toLowerCase()}`}
                >
                  {email.status}
                </div>

                {/* COMMUNICATION */}

                <div className="communication-method">

                  <span>
                    Communication
                  </span>

                  <select
                    value={
                      communicationMode[email.id] ||
                      "automatic"
                    }
                    onChange={(event) =>
                      handleCommunicationChange(
                        email.id,
                        event.target.value
                      )
                    }
                  >

                    <option value="automatic">
                      Automatic
                    </option>

                    <option value="draft">
                      Draft
                    </option>

                  </select>

                </div>

                {/* SUBJECT */}

                <div className="email-subject">

                  <span>
                    Subject
                  </span>

                  <p>
                    {email.subject}
                  </p>

                </div>

                {/* ACTIONS */}

                <div className="email-actions">

                  <button
                    type="button"
                    className="preview-button"
                    onClick={() =>
                      handlePreview(email)
                    }
                  >
                    Preview
                  </button>

                  {/* Edit is most useful for Draft */}

                  {communicationMode[email.id] === "draft" && (
                    <>
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() =>
                          handleEdit(email)
                        }
                      >
                        Edit Draft
                      </button>

                      {reviewedDrafts[email.id] && (
                        <span className="reviewed-badge">
                          ✓ Reviewed
                        </span>
                      )}
                    </>
                  )}

                  {/* Send button */}

                  <button
                    type="button"
                    className="send-button"
                    onClick={() =>
                      handleSend(email.id)
                    }
                  >
                    Send
                  </button>

                </div>

              </div>

            ))

        )}

      </div>

      {/* =====================================
          PREVIEW / EDIT MODAL
      ====================================== */}

      {selectedEmail && modalMode && (

        <div className="modal-overlay">

          <div className="email-modal">

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <div className="page-label">
                  {modalMode === "edit"
                    ? "EDIT EMAIL"
                    : "EMAIL PREVIEW"}
                </div>

                <h2>
                  Attendance Alert
                </h2>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => {
                  setSelectedEmail(null);
                  setModalMode(null);
                }}
              >
                ×
              </button>

            </div>

            {/* RECIPIENT */}

            <div className="email-details">

              <div>

                <span>
                  To
                </span>

                <p>
                  {selectedEmail.email}
                </p>

              </div>

              <div>

                <span>
                  Student
                </span>

                <p>
                  {selectedEmail.name}
                </p>

              </div>

              {/* SUBJECT */}

              <div>

                <span>
                  Subject
                </span>

                {modalMode === "edit" ? (

                  <input
                    className="edit-input"
                    value={editSubject}
                    onChange={(event) =>
                      setEditSubject(
                        event.target.value
                      )
                    }
                  />

                ) : (

                  <p>
                    {selectedEmail.subject}
                  </p>

                )}

              </div>

            </div>

            {/* MESSAGE */}

            <div className="email-message">

              <p>
                Dear{" "}
                {selectedEmail.name},
              </p>

              {modalMode === "edit" ? (

                <textarea
                  className="edit-textarea"
                  value={editMessage}
                  onChange={(event) =>
                    setEditMessage(
                      event.target.value
                    )
                  }
                />

              ) : (

                <p>
                  {selectedEmail.message}
                </p>

              )}

              {modalMode === "preview" && (
                <>
                  <p>
                    Please take the
                    necessary steps to
                    improve your
                    attendance.
                  </p>

                  <p>
                    Regards,
                    <br />
                    Mentor
                    <br />
                    AESA
                  </p>
                </>
              )}

            </div>

            {/* MODAL ACTIONS */}

            <div className="modal-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setSelectedEmail(null);
                  setModalMode(null);
                }}
              >
                Close
              </button>

              {modalMode === "edit" ? (

                <button
                  type="button"
                  className="modal-send-button"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </button>

              ) : (

                <button
                  type="button"
                  className="modal-send-button"
                  onClick={() =>
                    handleSend(
                      selectedEmail.id
                    )
                  }
                >
                  Send Email
                </button>

              )}

            </div>

          </div>

        </div>

      )}

    </section>
  );
}

export default EmailAutomation;