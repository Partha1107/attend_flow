const XLSX = require("xlsx");

const REQUIRED_COLUMNS = [
  "email",
  "date",
  "start_at",
  "end_at",
  "subject_title",
  "attendance",
];

const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

function normalizeDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return null;
  }
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) return value.toISOString().split("T")[0];
    return null;
  }
  const str = String(value).trim();
  if (!str) return null;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  const parts = str.split(/[/\-.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10));
    if (a && b && c) {
      if (a > 12) {
        const d = new Date(c, a - 1, b);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      } else {
        const d = new Date(c, b - 1, a);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      }
    }
  }
  return null;
}

function normalizeTime(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  if (value instanceof Date) {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const str = String(value).trim();
  if (!str) return null;
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[4]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const hours = parsed.getHours();
    const minutes = parsed.getMinutes();
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  return null;
}

function normalizeAttendance(value) {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim().toLowerCase();
  if (["present", "p", "1", "yes", "y", "true"].includes(str)) return "present";
  if (["absent", "a", "0", "no", "n", "false"].includes(str)) return "absent";
  if (["late", "l", "late arrival"].includes(str)) return "late";
  if (["od", "on duty", "official duty"].includes(str)) return "OD";
  if (["ml", "medical leave"].includes(str)) return "ML";
  if (["li", "leave", "leave of absence"].includes(str)) return "LI";
  return str || null;
}

function normalizeFlag(value) {
  if (value === null || value === undefined || value === "") return false;
  const str = String(value).trim().toLowerCase();
  return ["true", "1", "yes", "y", "od", "ml", "li"].includes(str);
}

function validateFileType(filename) {
  if (!filename) return false;
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.includes(ext);
}

function parseExcel(buffer, filename) {
  const warnings = [];
  const errors = [];

  if (!validateFileType(filename)) {
    return {
      records: [],
      warnings,
      errors: ["Unsupported file type. Please upload a .xlsx or .xls file."],
    };
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (err) {
    return {
      records: [],
      warnings,
      errors: [`Could not read Excel file: ${err.message}`],
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { records: [], warnings, errors: ["Excel file contains no sheets."] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (!rows || rows.length === 0) {
    return {
      records: [],
      warnings,
      errors: ["Excel file is empty. No attendance data found."],
    };
  }

  const headers = Object.keys(rows[0] || {}).map((h) => h.trim().toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

  if (missingColumns.length > 0) {
    return {
      records: [],
      warnings,
      errors: [
        `Missing required column(s): ${missingColumns.join(", ")}. Found columns: ${headers.join(", ") || "(none)"}`,
      ],
    };
  }

  const records = [];
  const seen = new Set();

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const email = String(row.email || "").trim().toLowerCase();
    const date = normalizeDate(row.date);
    const startAt = normalizeTime(row.start_at);
    const endAt = normalizeTime(row.end_at);
    const subjectTitle = String(row.subject_title || "").trim();
    const attendance = normalizeAttendance(row.attendance);
    const isOD = normalizeFlag(row.is_OD);
    const isML = normalizeFlag(row.is_ML);
    const isLI = normalizeFlag(row.is_LI);

    if (!email && !date && !subjectTitle) return;

    if (!email) {
      warnings.push(`Row ${rowNum}: Missing student email. Row skipped.`);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      warnings.push(`Row ${rowNum}: Invalid email "${email}". Row skipped.`);
      return;
    }
    if (!date) {
      warnings.push(`Row ${rowNum}: Invalid or missing date for ${email}. Row skipped.`);
      return;
    }
    if (!subjectTitle) {
      warnings.push(`Row ${rowNum}: Missing subject title for ${email} on ${date}. Row skipped.`);
      return;
    }
    if (!attendance) {
      warnings.push(`Row ${rowNum}: Missing attendance value for ${email} on ${date}. Row skipped.`);
      return;
    }

    const dedupeKey = `${email}|${date}|${startAt || ""}|${endAt || ""}|${subjectTitle.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      warnings.push(`Row ${rowNum}: Duplicate record for ${email} on ${date} (${subjectTitle}). Skipped.`);
      return;
    }
    seen.add(dedupeKey);

    records.push({
      email,
      date,
      start_at: startAt,
      end_at: endAt,
      subject_title: subjectTitle,
      attendance,
      is_OD: isOD,
      is_ML: isML,
      is_LI: isLI,
    });
  });

  if (records.length === 0) {
    errors.push("No valid attendance records found in the file.");
  }

  return { records, warnings, errors };
}

module.exports = { parseExcel, REQUIRED_COLUMNS };