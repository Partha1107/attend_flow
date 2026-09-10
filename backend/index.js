const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const attendanceRoutes = require("./src/routes/attendanceRoutes");
const emailAutomationRoutes = require("./src/routes/emailAutomationRoutes");
const mentorRoutes = require("./src/routes/mentorRoutes");
const mentorProfileRoutes = require("./src/routes/mentorProfileRoutes");
const mentorDashboardRoutes = require("./src/routes/mentorDashboardRoutes");
const parentEmailRoutes = require("./src/routes/parentEmailRoutes");

const app = express();

// ===============================
// CORS
// ===============================

const allowedOrigins = [
    "http://localhost:5173",
    "https://attendance-recored.vercel.app",
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests without an Origin
            // such as Postman/server-to-server requests
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error("Not allowed by CORS")
            );
        },
        credentials: true,
    })
);

// ===============================
// BODY PARSERS
// ===============================

app.use(
    express.json({
        limit: "20mb",
    })
);

app.use(
    express.urlencoded({
        extended: true,
    })
);

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "AESA Backend is running",
    });
});

// ===============================
// ROUTES
// ===============================

// Attendance
app.use(
    "/api/attendance",
    attendanceRoutes
);

// Email Automation
app.use(
    "/api/email-automation",
    emailAutomationRoutes
);

// Mentor
app.use(
    "/api/mentor",
    mentorRoutes
);

// Mentor Profile
app.use(
    "/api/mentor",
    mentorProfileRoutes
);

// Mentor Dashboard
app.use(
    "/api/mentor/dashboard",
    mentorDashboardRoutes
);

// Parent Email Import
app.use(
    "/api/parent-email",
    parentEmailRoutes
);

// ===============================
// JSON ERROR HANDLER
// ===============================

app.use((error, req, res, next) => {
    // Invalid JSON
    if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        "body" in error
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Request body contains invalid JSON.",
            error: error.message,
        });
    }

    // Payload too large
    if (
        error.type === "entity.too.large"
    ) {
        return res.status(413).json({
            success: false,
            message:
                "Import payload is too large. Please use a smaller Excel file.",
            error: "Payload Too Large",
        });
    }

    // Pass other errors to the next handler
    return next(error);
});

// ===============================
// 404 HANDLER
// ===============================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found.",
        error: `${ req.method } ${ req.originalUrl }`,
    });
});

// ===============================
// SERVER
// ===============================

const PORT =
    process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `AESA Backend running on port ${ PORT }`
    );
});