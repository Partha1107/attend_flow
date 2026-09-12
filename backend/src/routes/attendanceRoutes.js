const express = require("express");

const router = express.Router();

const attendanceController = require("../controllers/attendanceController");

const {
    requireAuth,
} = require("../middleware/authMiddleware");


/* =========================================================
   ATTENDANCE IMPORT
========================================================= */

router.post(
    "/import",
    attendanceController.importAttendance
);


/* =========================================================
   STUDENTS
========================================================= */

router.get(
    "/students",
    attendanceController.getStudents
);


/* =========================================================
   EMAIL ALERTS
========================================================= */

router.get(
    "/email-alerts",
    requireAuth,
    attendanceController.getEmailAlerts
);


/* =========================================================
   UPDATE STUDENT
========================================================= */

router.patch(
    "/students/:id",
    attendanceController.updateStudentDetails
);


module.exports = router;