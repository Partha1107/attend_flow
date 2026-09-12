const express = require("express");

const router = express.Router();

const mentorProfileController = require(
    "../controllers/mentorProfileController"
);

const { requireAuth } = require(
    "../middleware/authMiddleware"
);

// GET mentor profile
router.get(
    "/profile",
    requireAuth,
    mentorProfileController.getMentorProfile
);

// SAVE / UPDATE mentor profile
router.put(
    "/profile",
    requireAuth,
    mentorProfileController.saveMentorProfile
);

module.exports = router;