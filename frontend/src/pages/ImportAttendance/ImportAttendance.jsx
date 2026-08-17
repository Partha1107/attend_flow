import { FileSpreadsheet, Upload } from "lucide-react";
import "./ImportAttendance.css";

function ImportAttendance() {
  return (
    <div className="import-attendance-page">
      <div className="page-header">
        <div>
          <h1>Import Attendance</h1>
          <p>
            Upload an Excel file to import student attendance records.
          </p>
        </div>
      </div>

      <div className="import-card">
        <div className="import-icon">
          <FileSpreadsheet size={32} />
        </div>

        <h2>Upload Attendance Excel</h2>

        <p>
          Select an Excel file containing the attendance data.
        </p>

        <label className="upload-button">
          <Upload size={18} />
          <span>Select Excel File</span>

          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
          />
        </label>

        <span className="supported-format">
          Supported formats: .xlsx, .xls
        </span>
      </div>
    </div>
  );
}

export default ImportAttendance;