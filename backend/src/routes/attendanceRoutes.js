const express = require("express");

const router = express.Router();

const attendanceController = require("../controllers/attendanceController");

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

router.patch(
    "/students/:id",
    attendanceController.updateStudentDetails
);

module.exports = router;