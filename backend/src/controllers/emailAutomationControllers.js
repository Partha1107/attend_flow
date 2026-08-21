const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sendAttendanceEmail = async (req, res) => {
  try {
    const {
      studentName,
      studentEmail,
      parentEmail,
      attendancePercentage,
    } = req.body;

    // Check required data
    if (
      !studentName ||
      !studentEmail ||
      !parentEmail ||
      attendancePercentage === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required student or email information",
      });
    }

    // Only send email if attendance is below 75%
    if (Number(attendancePercentage) >= 75) {
      return res.json({
        success: true,
        message: "Attendance is 75% or above. Email not required.",
      });
    }

    const emailData = {
      sender: {
        name: process.env.BREVO_SENDER_NAME,
        email: process.env.BREVO_SENDER_EMAIL,
      },

      to: [
        {
          email: studentEmail,
          name: studentName,
        },
        {
          email: parentEmail,
          name: "Parent",
        },
      ],

      subject: "Attendance Warning - Low Attendance",

      htmlContent: `
        <html>
          <body>
            <h2>Attendance Warning</h2>

            <p>Dear Student and Parent,</p>

            <p>
              This is an attendance warning for
              <strong>${studentName}</strong>.
            </p>

            <p>
              Current Attendance:
              <strong>${attendancePercentage}%</strong>
            </p>

            <p>
              The required attendance percentage is
              <strong>75%</strong>.
            </p>

            <p>
              Please take the necessary steps to improve the attendance.
            </p>

            <br />

            <p>
              Regards,<br />
              ${process.env.BREVO_SENDER_NAME}
            </p>
          </body>
        </html>
      `,
    };

    const result =
      await brevo.transactionalEmails.sendTransacEmail(emailData);

    return res.status(200).json({
      success: true,
      message: "Attendance warning email sent successfully",
      messageId: result.messageId,
    });

  } catch (error) {
    console.error("Brevo email error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send attendance email",
      error: error.message,
    });
  }
};

module.exports = {
  sendAttendanceEmail,
};