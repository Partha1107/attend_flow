const express = require("express");

const router = express.Router();

const mentorProfileController = require(
    "../controllers/mentorProfileController"
);

// GET mentor profile
router.get(
    "/profile",
    mentorProfileController.getMentorProfile
);

// SAVE / UPDATE mentor profile
router.put(
    "/profile",
    mentorProfileController.saveMentorProfile
);

module.exports = router;