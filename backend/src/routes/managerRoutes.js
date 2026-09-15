const express = require("express");

const {
    getMentors,
    updateMentor,
} = require("../controllers/managerController");

const {
    requireAuth,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// GET ALL MENTORS
// ============================================================

router.get(
    "/mentors",
    requireAuth,
    getMentors
);

// ============================================================
// UPDATE MENTOR
// ============================================================

router.patch(
    "/mentors/:id",
    requireAuth,
    updateMentor
);

module.exports = router;