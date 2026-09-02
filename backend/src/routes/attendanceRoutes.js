const express = require("express");

const router = express.Router();

const attendanceController = require("../controllers/attendanceController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get(
    "/test-supabase",
    attendanceController.testSupabase
);

router.post(
    "/test-attendance",
    attendanceController.testAttendanceInsert
);

router.post(
    "/import",
    attendanceController.importAttendance
);

router.get(
    "/students",
    attendanceController.getStudents
);

router.get(
    "/records",
    attendanceController.getAttendanceRecords
);

router.get(
    "/email-alerts",
    requireAuth,
    attendanceController.getEmailAlerts
);

router.patch(
    "/students/:id",
    attendanceController.updateStudentDetails
);

module.exports = router;