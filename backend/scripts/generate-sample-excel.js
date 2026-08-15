const XLSX = require("xlsx");
const path = require("path");

// Sample attendance data
const rows = [
  {
    email: "student1@kalvium.community",
    date: "2026-08-10",
    start_at: "09:00",
    end_at: "10:00",
    subject_title: "Mathematics",
    attendance: "present",
    is_OD: false,
    is_ML: false,
    is_LI: false,
  },
  {
    email: "student1@kalvium.community",
    date: "2026-08-10",
    start_at: "10:00",
    end_at: "11:00",
    subject_title: "Physics",
    attendance: "present",
    is_OD: false,
    is_ML: false,
    is_LI: false,
  },
  {
    email: "student1@kalvium.community",
    date: "2026-08-11",
    start_at: "09:00",
    end_at: "10:00",
    subject_title: "Mathematics",
    attendance: "absent",
    is_OD: false,
    is_ML: false,
    is_LI: false,
  },
  {
    email: "student2@kalvium.community",
    date: "2026-08-10",
    start_at: "09:00",
    end_at: "10:00",
    subject_title: "Mathematics",
    attendance: "present",
    is_OD: false,
    is_ML: false,
    is_LI: false,
  },
  {
    email: "student2@kalvium.community",
    date: "2026-08-10",
    start_at: "10:00",
    end_at: "11:00",
    subject_title: "Physics",
    attendance: "OD",
    is_OD: true,
    is_ML: false,
    is_LI: false,
  },
  {
    email: "student2@kalvium.community",
    date: "2026-08-11",
    start_at: "09:00",
    end_at: "10:00",
    subject_title: "Mathematics",
    attendance: "present",
    is_OD: false,
    is_ML: false,
    is_LI: false,
  },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Attendance");

const outputPath = path.join(__dirname, "..", "sample-attendance.xlsx");
XLSX.writeFile(wb, outputPath);
console.log(`Sample Excel created at: ${outputPath}`);