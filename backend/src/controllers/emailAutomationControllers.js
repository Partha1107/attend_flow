const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY,
});

const sendTestEmail = async (req, res) => {
    try {
        const result = await brevo.transactionalEmails.sendTransacEmail({
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

module.exports = {
    sendTestEmail,
};