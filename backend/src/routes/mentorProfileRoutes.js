const express = require("express");
const router = express.Router();

const mentorProfileController = require(
    "../controllers/mentorProfileController"
);

const {
    requireAuth,
} = require("../middleware/authMiddleware");


router.get(
    "/profile",
    requireAuth,
    mentorProfileController.getMentorProfile
);


router.put(
    "/profile",
    requireAuth,
    mentorProfileController.saveMentorProfile
);


module.exports = router;