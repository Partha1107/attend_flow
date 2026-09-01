import {
  FileSpreadsheet,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
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
    icon: Users,
    to: "/students",
  },
  {
    label: "Attendance Records",
    icon: UserCheck,
    to: "/attendance-records",
  },
  {
    label: "Import Attendance",
    icon: FileSpreadsheet,
    to: "/import-attendance",
  },
  {
    label: "Email Automation",
    icon: Mail,
    to: "/email-automation",
  },
  {
    label: "Communication History",
    icon: History,
    to: "/communication-history",
  },
  {
    label: "Settings",
    icon: Settings,
    to: "/settings",
  },
];

function Sidebar({ open = false, onClose = () => { } }) {
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-mark">
          <GraduationCap size={24} strokeWidth={2.4} />
        </div>

        <div className="brand-text">
          <div className="brand-name">AESA</div>
          <div className="brand-subtitle">
            Attendance &amp; Alert
            <br />
            Automation System
          </div>
        </div>

        <button
          className="mobile-close"
          type="button"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {mainItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout at bottom */}
      <div className="sidebar-footer">
        <NavLink to="/login" className="logout-btn" onClick={onClose}>
          <LogOut size={18} />
          <span>Logout</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;