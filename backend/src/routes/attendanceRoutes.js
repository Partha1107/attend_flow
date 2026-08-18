const express = require("express");
const { importAttendance } = require("../controllers/attendanceController");

const router = express.Router();

router.post("/import", importAttendance);

module.exports = router;