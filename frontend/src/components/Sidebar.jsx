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

import { NavLink } from "react-router-dom";
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
  },
  {
    label: "Alerts",
    icon: AlertTriangle,
  },
  {
    label: "Communications",
    icon: Mail,
  },
  {
    label: "Analytics",
    icon: BarChart3,
  },
  {
    label: "Settings",
    icon: Settings,
  },
];

function Sidebar({ open = false, onClose = () => {} }) {
  const { pathname } = useLocation();

  const isImportActive = pathname === "/import-attendance";
  const isRecordsActive = pathname === "/attendance-records";

  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
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

      <nav className="sidebar-nav" aria-label="Main navigation">
        {mainItems.map(({ label, icon: Icon }) => {
          const destination =
            label === "Dashboard"
              ? "/dashboard"
              : label === "Students"
                ? "/students"
                : `/${label.toLowerCase()}`;

          return (
            <div key={label} className="nav-group">
              <NavLink
                to={destination}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                onClick={onClose}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>

              {label === "Dashboard" && (
                <div className="attendance-group">
                  <div className="attendance-title">
                    <ShieldCheck size={18} />
                    <span>Attendance</span>
                    <ChevronDown size={15} className="attendance-chevron" />
                  </div>

                  <NavLink
                    to="/import-attendance"
                    className="subnav-item"
                    onClick={onClose}
                  >
                    <FileSpreadsheet size={16} />
                    <span>Import Excel</span>
                  </NavLink>

                  <NavLink
                    to="/dashboard"
                    className="subnav-item"
                    onClick={onClose}
                  >
                    <Bell size={16} />
                    <span>Attendance Records</span>
                  </NavLink>
                </div>
              )}
            </div>
          );
        })}
      </nav>

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