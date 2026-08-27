const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const cors = require("cors");

// const attendanceRoutes = require("./src/routes/attendanceRoutes");
// const emailAutomationRoutes = require("./src/routes/emailAutomationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "AESA Backend is running",
    });
});

// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/email-automation", emailAutomationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`AESA Backend running on port ${PORT}`);
});