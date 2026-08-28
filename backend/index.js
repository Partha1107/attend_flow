const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const cors = require("cors");

const attendanceRoutes = require("./src/routes/attendanceRoutes");
const emailAutomationRoutes = require("./src/routes/emailAutomationRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "AESA Backend is running",
    });
});

app.use("/api/attendance", attendanceRoutes);
app.use("/api/email-automation", emailAutomationRoutes);

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            success: false,
            message: "Request body contains invalid JSON.",
            error: error.message,
        });
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Import payload is too large. Please use a smaller Excel file.",
            error: "Payload Too Large",
        });
    }

    return next(error);
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found.",
        error: `${req.method} ${req.originalUrl}`,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`AESA Backend running on port ${PORT}`);
});