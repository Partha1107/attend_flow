import { Routes, Route } from "react-router-dom";

// Layout
import DashboardLayout from "../layouts/DashboardLayout";

// Protection
import ProtectedRoute from "./ProtectedRoute";

// Pages
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import AccessDenied from "../pages/AccessDenied/AccessDenied";
import ImportAttendance from "../pages/ImportAttendance/ImportAttendance";
import AttendanceRecords from "../pages/AttendanceRecords/AttendanceRecords";
import StudentPage from "../pages/student-page/StudentPage";

import CommunicationHistory from "../pages/CommunicationHistory/CommunicationHistory";
import EmailAutomation from "../pages/EmailAutomation/EmailAutomation";
import NotFound from "../pages/NotFound page/NotFound";

function AppRoutes() {
  return (
    <Routes>

      {/* ================= PUBLIC ================= */}

      <Route path="/login" element={<Login />} />

      <Route
        path="/access-denied"
        element={<AccessDenied />}
      />


      {/* ================= PROTECTED ================= */}

      <Route element={<ProtectedRoute />}>

        <Route path="/" element={<DashboardLayout />}>

          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Other Pages */}
          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          <Route
            path="import-attendance"
            element={<ImportAttendance />}
          />

          <Route
            path="attendance-records"
            element={<AttendanceRecords />}
          />

          <Route
            path="students"
            element={<StudentPage />}
          />

          <Route
            path="communication-history"
            element={<CommunicationHistory />}
          />

          <Route
            path="email-automation"
            element={<EmailAutomation />}
          />

        </Route>

      </Route>


      {/* ================= NOT FOUND ================= */}

      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  );
}

export default AppRoutes;