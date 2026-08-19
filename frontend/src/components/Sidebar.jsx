import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  FileSpreadsheet,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Mail,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

const mainItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/dashboard",
  },
  {
    label: "Students",
    icon: UsersRound,
    to: "/students",
  },
  {
    label: "Alerts",
    icon: AlertTriangle,
    to: "/alerts",
  },
  {
    label: "Communications",
    icon: Mail,
    to: "/communication-history",
  },
  {
    label: "EmailAutomation",
    icon: Mail,
    to: "/email-automation",
  },


  {
    label: "Analytics",
    icon: BarChart3,
    to: "/analytics",
  },
  {
    label: "Settings",
    icon: Settings,
    to: "/settings",
  },
];

function Sidebar({ open = false, onClose = () => { } }) {
  const { pathname } = useLocation();

  const isImportActive = pathname === "/import-attendance";
  const isRecordsActive = pathname === "/attendance-records";

  const isEmailAutomationActive =
    pathname === "/email-automation";

  const isCommunicationHistoryActive =
    pathname === "/communication-history";

  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-mark">
          <GraduationCap size={27} strokeWidth={2.2} />
        </div>

        <div>
          <div className="brand-name">AESA</div>

          <div className="brand-subtitle">
            Attendance &amp; Alert
            <br />
            Automation
          </div>
        </div>

        <button
          className="mobile-close"
          type="button"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {mainItems.map(({ label, icon: Icon, to }) => (
          <div key={label} className="nav-group">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>

            {/* Attendance Section */}
            {label === "Dashboard" && (
              <div className="attendance-group">
                <div className="attendance-title">
                  <ShieldCheck size={18} />
                  <span>Attendance</span>
                  <ChevronDown
                    size={15}
                    className="attendance-chevron"
                  />
                </div>

                <NavLink
                  to="/import-attendance"
                  className={`subnav-item ${isImportActive ? "active" : ""
                    }`}
                  onClick={onClose}
                >
                  <FileSpreadsheet size={16} />
                  <span>Import Excel</span>
                </NavLink>

                <NavLink
                  to="/attendance-records"
                  className={`subnav-item ${isRecordsActive ? "active" : ""
                    }`}
                  onClick={onClose}
                >
                  <Bell size={16} />
                  <span>Attendance Records</span>
                </NavLink>
              </div>
            )}

            {/* Communications Section */}
            {label === "Communications" && (
              <div className="attendance-group">

                <NavLink
                  to="/email-automation"
                  className={`subnav-item ${isEmailAutomationActive ? "active" : ""
                    }`}
                  onClick={onClose}
                >
                  <Mail size={16} />
                  <span>Email Automation</span>
                </NavLink>

                <NavLink
                  to="/communication-history"
                  className={`subnav-item ${isCommunicationHistoryActive ? "active" : ""
                    }`}
                  onClick={onClose}
                >
                  <Mail size={16} />
                  <span>Communication History</span>
                </NavLink>

              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Help */}
      <div className="sidebar-help">
        <div className="help-icon">
          <Headphones size={20} />
        </div>

        <div className="help-copy">
          <h3>Need Help?</h3>

          <p>
            Contact support if you need any assistance.
          </p>
        </div>

        <button
          type="button"
          className="support-button"
        >
          Contact Support
        </button>
      </div>

      {/* User */}
      <div className="sidebar-user">
        <div className="mini-avatar">
          <UserRound size={17} />
        </div>

        <div>
          <strong>Mentor</strong>
          <span>Mentor Portal</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;