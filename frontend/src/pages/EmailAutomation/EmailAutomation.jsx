import React, { useState } from "react";
import "./EmailAutomation.css";

const emailData = [
  {
    id: 1,
    name: "Rahul Kumar",
    email: "rahul@student.edu",
    attendance: 62,
    status: "Critical",
    subject: "Attendance Alert - Immediate Attention Required",
    message:
      "Your current attendance is 62%. Please improve your attendance to meet the required attendance percentage.",
  },
  {
    id: 2,
    name: "Priya Sharma",
    email: "priya@student.edu",
    attendance: 68,
    status: "Warning",
    subject: "Attendance Warning",
    message:
      "Your current attendance is 68%. Please make sure to attend your upcoming classes regularly.",
  },
  {
    id: 3,
    name: "Arun Kumar",
    email: "arun@student.edu",
    attendance: 72,
    status: "Warning",
    subject: "Attendance Reminder",
    message:
      "Your current attendance is 72%. Please maintain regular attendance to avoid falling below the required level.",
  },
];

function EmailAutomation() {
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [emails, setEmails] = useState(emailData);

  const today = new Date().toISOString().split("T")[0];

  const handlePreview = (email) => {
    setSelectedEmail(email);
    setShowPreview(true);
  };

  const handleSend = (id) => {
    setEmails((prevEmails) =>
      prevEmails.filter((email) => email.id !== id)
    );

    alert("Email sent successfully!");
  };

  return (
    <div className="email-automation-page">

      {/* Page Header */}
      <div className="email-page-header">
        <div>
          <p className="page-label">COMMUNICATIONS</p>
          <h1>Email Automation</h1>
          <p>
            Generate, review and send attendance alert emails to students.
          </p>
        </div>

        <div className="date-section">
          <label htmlFor="attendance-date">
            Attendance Date
          </label>

          <input
            id="attendance-date"
            type="date"
            defaultValue={today}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="email-summary">

        <div className="email-summary-card">
          <span className="summary-icon">✉</span>
          <div>
            <p>Students Requiring Alerts</p>
            <h2>{emails.length}</h2>
          </div>
        </div>

        <div className="email-summary-card">
          <span className="summary-icon">⚠</span>
          <div>
            <p>Draft Emails</p>
            <h2>{emails.length}</h2>
          </div>
        </div>

        <div className="email-summary-card">
          <span className="summary-icon">✓</span>
          <div>
            <p>Ready to Send</p>
            <h2>{emails.length}</h2>
          </div>
        </div>

      </div>

      {/* Generate Section */}
      <div className="generate-section">

        <div>
          <h2>Attendance Alert Emails</h2>
          <p>
            Review the automatically generated emails before sending them.
          </p>
        </div>

        <button className="generate-button">
          + Generate Email Drafts
        </button>

      </div>

      {/* Email List */}
      <div className="email-list">

        {emails.length === 0 ? (
          <div className="empty-email">
            <h3>No emails pending</h3>
            <p>
              All attendance alert emails have been processed.
            </p>
          </div>
        ) : (
          emails.map((email) => (
            <div className="email-card" key={email.id}>

              {/* Student Information */}
              <div className="student-email-info">

                <div className="student-avatar">
                  {email.name.charAt(0)}
                </div>

                <div>
                  <h3>{email.name}</h3>
                  <p>{email.email}</p>
                </div>

              </div>

              {/* Attendance */}
              <div className="attendance-info">
                <span>Attendance</span>

                <strong>{email.attendance}%</strong>
              </div>

              {/* Status */}
              <div className={`email-status ${email.status.toLowerCase()}`}>
                {email.status}
              </div>

              {/* Subject */}
              <div className="email-subject">
                <span>Subject</span>
                <p>{email.subject}</p>
              </div>

              {/* Actions */}
              <div className="email-actions">

                <button
                  className="preview-button"
                  onClick={() => handlePreview(email)}
                >
                  Preview
                </button>

                <button
                  className="edit-button"
                  onClick={() => handlePreview(email)}
                >
                  Edit
                </button>

                <button
                  className="send-button"
                  onClick={() => handleSend(email.id)}
                >
                  Send
                </button>

              </div>

            </div>
          ))
        )}

      </div>

      {/* Preview Modal */}
      {showPreview && selectedEmail && (
        <div className="modal-overlay">

          <div className="email-modal">

            <div className="modal-header">
              <div>
                <p className="page-label">EMAIL PREVIEW</p>
                <h2>Attendance Alert</h2>
              </div>

              <button
                className="close-button"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>

            <div className="email-details">

              <div>
                <span>To</span>
                <p>{selectedEmail.email}</p>
              </div>

              <div>
                <span>Student</span>
                <p>{selectedEmail.name}</p>
              </div>

              <div>
                <span>Subject</span>
                <p>{selectedEmail.subject}</p>
              </div>

            </div>

            <div className="email-message">

              <p>Dear {selectedEmail.name},</p>

              <p>
                {selectedEmail.message}
              </p>

              <p>
                Please take the necessary steps to improve your
                attendance.
              </p>

              <p>
                Regards,
                <br />
                Mentor
                <br />
                AESA
              </p>

            </div>

            <div className="modal-actions">

              <button
                className="cancel-button"
                onClick={() => setShowPreview(false)}
              >
                Close
              </button>

              <button
                className="modal-send-button"
                onClick={() => {
                  handleSend(selectedEmail.id);
                  setShowPreview(false);
                }}
              >
                Send Email
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default EmailAutomation;