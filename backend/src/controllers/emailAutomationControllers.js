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
    return { data: [], error: null, missing: true };
  }

  return { data: data || [], error, missing: false };
};
const saveCommunicationHistory = async (record) => {
  try {
    const now = new Date().toISOString();

    const dbRecord = {
      student_id: record.student_id || null,
      student_name: record.student_name,
      student_email: record.student_email || null,
      parent_email: record.parent_email,
      attendance_percentage: Number(record.attendance_percentage),
      attendance_date: now.split("T")[0],
      academic_year: "2026-2027",
      status: "Sent",
      communication_type: "Email",
      mentor_name: record.mentor_name || null,
      mentor_email: record.mentor_email || null,
      sent_at: record.sent_at || now,
      created_at: now,
      updated_at: now,
    };

    console.log("Saving communication history:", dbRecord);

    const { data, error } = await supabase
      .from("email_automation")
      .insert([dbRecord])
      .select()
      .single();

    if (error) {
      console.error("Supabase history insert error:", error);

      return {
        saved: false,
        error,
      };
    }

    console.log("Communication history saved successfully:", data);

    return {
      saved: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error("saveCommunicationHistory error:", error);

    return {
      saved: false,
      error,
    };
  }
};

const sendEmailForStudent = async ({
  student,
  mentorName,
  mentorEmail,
  subject,
  message,
}) => {
  const result = await brevo.transactionalEmails.sendTransacEmail({
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name: mentorName,
    },
    to: [
      {
        email: student.parentEmail,
        name: "parent",
      },
    ],
    subject: subject || "Attendance Warning - Low Attendance",
    htmlContent: `
      <html>
        <body>
          <h2>Attendance Warning</h2>
          <p>Dear ${student.name},</p>
          <p>Your current attendance is <strong>${student.attendancePercentage}%</strong>.</p>
          <p>The required attendance percentage is <strong>75%</strong>.</p>
          <p>${message || "Please improve your attendance."}</p>
          <br>
          <p>Regards,<br><strong>${mentorName}</strong><br>AESA</p>
        </body>
      </html>
    `,
  });

  const sentAt = new Date().toISOString();
  const historyRecord = {
    student_id: student.id || null,
    student_name: student.name,
    student_email: student.email || null,
    parent_email: student.parentEmail,
    attendance_percentage: student.attendancePercentage,
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

  return {
    ...historyRecord,
    historySaved,
    messageId: result.messageId,
  };
};

// ==========================================
// TEST EMAIL
// ==========================================
const sendTestEmail = async (req, res) => {
  try {
    const senderEmail = String(process.env.BREVO_SENDER_EMAIL || "").trim();
    const receiverEmail = String(process.env.TEST_RECEIVER_EMAIL || "").trim();

    if (!isValidEmail(senderEmail) || !isValidEmail(receiverEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid sender and test receiver email are required.",
      });
    }

    const result =
      await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: "AttendFlow Test",
          email: senderEmail,
        },

        to: [
          {
            email: receiverEmail,
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
    const requestedStudentIds = Array.isArray(req.body?.studentIds)
      ? req.body.studentIds.filter(Boolean)
      : req.body?.studentId
        ? [req.body.studentId]
        : [];

    const {
      mentorName,
      mentorEmail,
      parentEmail,
      subject,
      message,
    } = req.body;

    if (!mentorName || requestedStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "mentorName and at least one studentId are required.",
      });
    }

    const { data: selectedStudents, error: studentsError } = await supabase
      .from("students")
      .select("id, name, email, parent_email")
      .in("id", requestedStudentIds);

    if (studentsError) {
      throw studentsError;
    }

    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("overall_attendance")
      .select("student_id, attendance_percentage")
      .in("student_id", requestedStudentIds);

    if (attendanceError) {
      throw attendanceError;
    }

    const attendanceByStudentId = new Map(
      (attendanceRows || []).map((row) => [
        String(row.student_id),
        Number(row.attendance_percentage) || 0,
      ])
    );
    const selectedById = new Map(
      (selectedStudents || []).map((student) => [String(student.id), student])
    );
    const missingStudentIds = requestedStudentIds.filter(
      (studentId) => !selectedById.has(String(studentId))
    );

    if (missingStudentIds.length > 0) {
      return res.status(404).json({
        success: false,
        message: "One or more selected students were not found.",
        studentIds: missingStudentIds,
      });
    }

    const selectedWithAttendance = requestedStudentIds.map((studentId) => ({
      ...selectedById.get(String(studentId)),
      attendancePercentage: attendanceByStudentId.get(String(studentId)) || 0,
    }));
    const ineligibleStudents = selectedWithAttendance.filter(
      (student) => student.attendancePercentage >= 75
    );

    if (ineligibleStudents.length > 0) {
      return res.status(422).json({
        success: false,
        message: "Email can only be sent to students below 75% attendance.",
        ineligibleStudents: ineligibleStudents.map((student) => ({
          id: student.id,
          name: student.name,
          attendancePercentage: student.attendancePercentage,
        })),
      });
    }

    if (!isValidEmail(process.env.BREVO_SENDER_EMAIL)) {
      return res.status(500).json({
        success: false,
        message: "Email service is not configured. Set BREVO_SENDER_EMAIL in the backend environment.",
      });
    }

    const studentsToSend = selectedWithAttendance.map((student) => ({
      ...student,
      parentEmail: student.parent_email || parentEmail,
    }));
    const invalidParentEmailStudent = studentsToSend.find(
      (student) => !isValidEmail(student.parentEmail)
    );

    if (invalidParentEmailStudent) {
      return res.status(400).json({
        success: false,
        message: `A valid parent email is required for ${invalidParentEmailStudent.name}.`,
      });
    }

    const sentRecords = [];
    for (const student of studentsToSend) {
      sentRecords.push(await sendEmailForStudent({
        student,
        mentorName,
        mentorEmail,
        subject,
        message,
      }));
    }

    return res.status(200).json({
      success: true,
      message: `${sentRecords.length} attendance email${sentRecords.length === 1 ? "" : "s"} sent successfully`,
      messageId: sentRecords.length === 1 ? sentRecords[0].messageId : undefined,
      history: sentRecords.length === 1 ? sentRecords[0] : sentRecords,
      historySaved: sentRecords.every((record) => record.historySaved),
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

// ==========================================
// GET EMAIL / COMMUNICATION HISTORY
// ==========================================

const getEmailAutomationRecords = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("email_automation")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
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

    const records = (data || []).map((record) => ({
      ...record,

      sent_at: record.sent_at || null,

      communication_type:
        record.communication_type || "Email",

      status:
        record.status || "pending",
    }));

    return res.status(200).json({
      success: true,
      records,
      data: records,
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

module.exports = {
  sendTestEmail,
  sendAttendanceEmail,
  getEmailAutomationRecords,
};
