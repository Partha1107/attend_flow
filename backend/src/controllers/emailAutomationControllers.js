const { BrevoClient } = require("@getbrevo/brevo");
const supabase = require("../config/supabase");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const isMissingTableError = (error) =>
  ["42P01", "PGRST205"].includes(error?.code);

const normalizeHistoryRecord = (record) => ({
  ...record,
  sent_at: record.sent_at || null,
  communication_type: record.communication_type || "Email",
  status: record.status || "pending",
});

const fetchHistoryFromTable = async (tableName) => {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .order("sent_at", { ascending: false, nullsFirst: false });

  if (isMissingTableError(error)) {
    return { data: [], error: null };
  }

  return { data: data || [], error };
};

const saveCommunicationHistory = async (historyRecord) => {
  const fallbackRecord = {
    student_id: historyRecord.student_id,
    student_name: historyRecord.student_name,
    student_email: historyRecord.student_email,
    parent_email: historyRecord.parent_email,
    attendance_percentage: historyRecord.attendance_percentage,
    subject: historyRecord.subject,
    message: historyRecord.message,
    status: historyRecord.status,
    communication_type: historyRecord.communication_type,
    mentor_name: historyRecord.mentor_name,
    mentor_email: historyRecord.mentor_email,
    sent_at: historyRecord.sent_at,
  };

  let { error: historyError } = await supabase
    .from("communication_history")
    .insert(historyRecord);

  if (isMissingTableError(historyError)) {
    const fallbackResult = await supabase
      .from("email_automation")
      .insert(fallbackRecord);
    historyError = fallbackResult.error;
  }

  return { saved: !historyError, error: historyError };
};

// ==========================================
// TEST EMAIL
// ==========================================
const sendTestEmail = async (req, res) => {
  try {
    const result =
      await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: "AttendFlow Test",
          email: process.env.BREVO_SENDER_EMAIL,
        },

        to: [
          {
            email: process.env.TEST_RECEIVER_EMAIL,
            name: "Test User",
          },
        ],

        subject: "AttendFlow - Brevo Test Email",

        htmlContent: `
          <html>
            <body>
              <h2>AttendFlow Email Test</h2>

              <p>Hello,</p>

              <p>
                This is a test email from the
                AttendFlow attendance automation system.
              </p>

              <p>
                Brevo connection is working successfully.
              </p>

              <p>
                Regards,<br>
                AttendFlow
              </p>
            </body>
          </html>
        `,
      });

    return res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Brevo error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
};

// ==========================================
// SEND ATTENDANCE EMAIL
// ==========================================
const sendAttendanceEmail = async (req, res) => {
  try {
    const {
      mentorName,
      mentorEmail,
      studentId,
      studentName,
      studentEmail,
      parentEmail,
      attendancePercentage,
      subject,
      message,
    } = req.body;

    // Validate required fields
    if (!mentorName || !studentName || attendancePercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required email information",
      });
    }

    if (!isValidEmail(process.env.BREVO_SENDER_EMAIL) || !isValidEmail(parentEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid sender and parent email are required.",
      });
    }

    // Only send if attendance is below 75%
    if (Number(attendancePercentage) >= 75) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance is 75% or above. Email should not be sent.",
      });
    }

    const result =
      await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          // Common verified sender email
          email: process.env.BREVO_SENDER_EMAIL,

          // Automatically detected mentor name
          name: mentorName,
        },

        to: [
          {
            email: parentEmail,
            name: "parent",
          },
        ],

        subject:
          subject ||
          "Attendance Warning - Low Attendance",

        htmlContent: `
          <html>
            <body>
              <h2>Attendance Warning</h2>

              <p>
                Dear ${studentName},
              </p>

              <p>
                Your current attendance is
                <strong>${attendancePercentage}%</strong>.
              </p>

              <p>
                The required attendance percentage is
                <strong>75%</strong>.
              </p>

              <p>
                ${message || "Please improve your attendance."}
              </p>

              <br>

              <p>
                Regards,<br>
                <strong>${mentorName}</strong><br>
                AESA
              </p>
            </body>
          </html>
        `,
      });

    const sentAt = new Date().toISOString();
    const historyRecord = {
      student_id: studentId || null,
      student_name: studentName,
      student_email: studentEmail || null,
      parent_email: parentEmail,
      attendance_percentage: Number(attendancePercentage),
      subject: subject || "Attendance Warning - Low Attendance",
      message: message || "Please improve your attendance.",
      communication_type: "Email",
      status: "Sent",
      message_id: result.messageId || null,
      mentor_name: mentorName,
      mentor_email: mentorEmail || null,
      sent_at: sentAt,
    };

    const { saved: historySaved, error: historyError } =
      await saveCommunicationHistory(historyRecord);

    if (historyError) {
      console.warn(
        "Email was sent, but communication history could not be saved:",
        historyError.message
      );
    }

    return res.status(200).json({
      success: true,
      message: "Attendance email sent successfully",
      messageId: result.messageId,
      history: historyRecord,
      historySaved,
      sentBy: mentorName,
      mentorEmail,
    });
  } catch (error) {
    console.error(
      "Attendance email error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send attendance email",
      error: error.message,
    });
  }
};
// ==========================================
// GET EMAIL / COMMUNICATION HISTORY
// ==========================================

const getEmailAutomationRecords = async (req, res) => {
  try {
    const [communicationHistory, emailAutomation] = await Promise.all([
      fetchHistoryFromTable("communication_history"),
      fetchHistoryFromTable("email_automation"),
    ]);

    const fetchError =
      communicationHistory.error || emailAutomation.error;

    if (fetchError) {
      console.error(
        "Get email automation records error:",
        fetchError
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch communication history.",
        error: fetchError.message,
      });
    }

    const seen = new Set();
    const mergedRecords = [
      ...communicationHistory.data,
      ...emailAutomation.data,
    ]
      .filter((record) => {
        const key = [
          record.id,
          record.student_id,
          record.parent_email,
          record.sent_at,
          record.created_at,
        ].join("|");

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort((left, right) => {
        const leftTime = new Date(
          left.sent_at || left.created_at || 0
        ).getTime();
        const rightTime = new Date(
          right.sent_at || right.created_at || 0
        ).getTime();

        return rightTime - leftTime;
      })
      .map(normalizeHistoryRecord);

    return res.status(200).json({
      success: true,

      // Primary response property
      records: mergedRecords,

      // Keep data too for compatibility
      // with your existing frontend.
      data: mergedRecords,
    });
  } catch (error) {
    console.error(
      "Get email automation records error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch communication history.",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORT
// ==========================================
module.exports = {
  sendTestEmail,
  sendAttendanceEmail,
  getEmailAutomationRecords,
};  
