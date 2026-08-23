const express = require("express");

const router = express.Router();

const emailAutomationController = require("../controllers/emailAutomationControllers");

router.post(
  "/test-email",
  emailAutomationController.sendTestEmail
);

router.post(
  "/send",
  emailAutomationController.sendAttendanceEmail
);

module.exports = router;