const express = require("express");
const multer = require("multer");
const { parseExcel } = require("../services/excelParser");
const { importAttendance, getRecentImports } = require("../services/attendanceService");

const router = express.Router();

// Use memory storage so we can parse the buffer directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

/**
 * POST /api/attendance/import
 * Upload an Excel file and import attendance records.
 */
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    const filename = req.file.originalname;
    const { records, warnings, errors } = parseExcel(req.file.buffer, filename);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(" "),
        warnings,
      });
    }

    const result = await importAttendance({ filename, records, warnings });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        warnings,
      });
    }

    return res.status(200).json({
      success: true,
      summary: result.summary,
      warnings,
    });
  } catch (err) {
    console.error("Import error:", err);
    return res.status(500).json({
      success: false,
      error: `Unexpected error during import: ${err.message}`,
    });
  }
});

/**
 * GET /api/attendance/imports
 * Get recent imports.
 */
router.get("/imports", async (_req, res) => {
  try {
    const { data, error } = await getRecentImports(10);
    if (error) {
      return res.status(500).json({ success: false, error });
    }
    return res.status(200).json({ success: true, imports: data });
  } catch (err) {
    console.error("Get imports error:", err);
    return res.status(500).json({
      success: false,
      error: `Unexpected error: ${err.message}`,
    });
  }
});

module.exports = router;