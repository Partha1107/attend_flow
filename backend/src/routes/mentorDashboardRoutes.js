const express = require("express");

const router = express.Router();

const mentorDashboardController = require(
    "../controllers/mentorDashboardController"
);

const { requireAuth } = require(
    "../middleware/authMiddleware"
);

// ============================================================
// GET ALL AVAILABLE SQUADS
// ============================================================

router.get(
    "/squads",
    requireAuth,
    mentorDashboardController.getSquads
);

// ============================================================
// GET STUDENTS
// ============================================================

router.get(
    "/students",
    requireAuth,
    mentorDashboardController.getStudents
);

// ============================================================
// GET ATTENDANCE
// ============================================================

router.get(
    "/attendance",
    requireAuth,
    mentorDashboardController.getAttendanceRecords
);

// ============================================================
// GET OVERVIEW
// ============================================================

router.get(
    "/overview",
    requireAuth,
    mentorDashboardController.getOverview
);

// ============================================================
// UPDATE STUDENT CONTACT
// ============================================================

router.patch(
    "/students/:id/contact",
    requireAuth,
    mentorDashboardController.updateStudentContact
);

module.exports = router;