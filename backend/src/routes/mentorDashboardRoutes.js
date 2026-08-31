const express = require("express");

const router = express.Router();

const mentorDashboardController = require(
    "../controllers/mentorDashboardController"
);

// ============================================================
// GET ALL SQUADS
// ============================================================

router.get(
    "/squads",
    mentorDashboardController.getSquads
);

// ============================================================
// GET STUDENTS
//
// /api/mentor/dashboard/students
// /api/mentor/dashboard/students?squad=138
// ============================================================

router.get(
    "/students",
    mentorDashboardController.getStudents
);

// ============================================================
// GET ATTENDANCE
//
// /api/mentor/dashboard/attendance
// /api/mentor/dashboard/attendance?squad=138
// ============================================================

router.get(
    "/attendance",
    mentorDashboardController.getAttendanceRecords
);

// ============================================================
// GET OVERVIEW
//
// /api/mentor/dashboard/overview
// /api/mentor/dashboard/overview?squad=138
// ============================================================

router.get(
    "/overview",
    mentorDashboardController.getOverview
);

module.exports = router;