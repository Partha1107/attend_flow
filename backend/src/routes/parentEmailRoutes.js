const express = require("express");

const router = express.Router();
const parentEmailController = require("../controllers/parentEmailController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post(
    "/import",
    requireAuth,
    parentEmailController.importParentEmails
);

module.exports = router;
