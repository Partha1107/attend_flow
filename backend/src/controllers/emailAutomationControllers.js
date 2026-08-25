const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

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
      studentName,
      studentEmail,
      parentEmail,
      attendancePercentage,
      subject,
      message,
    } = req.body;

    // Validate required fields
    if (
      !mentorName ||
      !studentName ||
      !studentEmail ||
      !parentEmail ||
      attendancePercentage === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required email information",
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
            email: studentEmail,
            name: studentName,
          },
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

    return res.status(200).json({
      success: true,
      message: "Attendance email sent successfully",
      messageId: result.messageId,
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
// EXPORT
// ==========================================
module.exports = {
  sendTestEmail,
  sendAttendanceEmail,
};