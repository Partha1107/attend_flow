import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import AccessDenied from "../pages/AccessDenied/AccessDenied";
import ImportAttendance from "../pages/ImportAttendance/ImportAttendance";
import AttendanceRecords from "../pages/AttendanceRecords/AttendanceRecords";

import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";

const AppRoutes = () => {
  const isDev = import.meta.env.DEV;

  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/login" element={<Login />} />

        <Route
          path="/access-denied"
          element={<AccessDenied />}
        />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/import-attendance"
              element={<ImportAttendance />}
            />

            <Route
              path="/attendance-records"
              element={<AttendanceRecords />}
            />

          </Route>
        </Route>

        {/* Dev preview (no auth) */}
        {isDev && (
          <Route element={<DashboardLayout />}>
            <Route
              path="/dashboard-preview"
              element={<Dashboard />}
            />
          </Route>
        )}

        {/* Root */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Unknown */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;