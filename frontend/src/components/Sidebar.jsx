import {
  ChevronDown,
  FileSpreadsheet,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Mail,
  Users,
  X,
} from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import { getMentorProfile } from "../api/mentor";
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
    label: "Email Automation",
    icon: Mail,
    to: "/email-automation",
  },
  {
    label: "Communication History",
    icon: History,
    to: "/communication-history",
  },
];

function Sidebar({ open = false, onClose = () => { } }) {
  const location = useLocation();

  const [jobRole, setJobRole] = useState(null);

  const isImportPage =
    location.pathname === "/import-attendance" ||
    location.pathname === "/parent-email-import";

  const [dataImportOpen, setDataImportOpen] =
    useState(isImportPage);

  // ============================================================
  // LOAD MENTOR ROLE
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const loadMentorRole = async () => {
      try {
        const result = await getMentorProfile();

        if (!mounted) {
          return;
        }

        console.log(
          "SIDEBAR PROFILE:",
          JSON.stringify(result?.profile, null, 2)
        );

        const role = result?.profile?.job_role;

        console.log(
          "🔥 ROLE FROM API:",
          role
        );

        setJobRole(role || null);

      } catch (error) {
        console.error(
          "Failed to load mentor role:",
          error
        );

        if (mounted) {
          setJobRole(null);
        }
      }
    };

    void loadMentorRole();

    return () => {
      mounted = false;
    };
  }, []);

  // Automatically open Data Import when visiting
  // either import page.
  useEffect(() => {
    if (isImportPage) {
      setDataImportOpen(true);
    }
  }, [isImportPage]);

  const isCampusManager =
    jobRole === "campus_manager";

  return (
    <aside
      className={`sidebar ${open ? "sidebar-open" : ""
        }`}
    >
      {/* ================================================== */}
      {/* BRAND */}
      {/* ================================================== */}

      <div className="sidebar-brand">
        <div className="brand-mark">
          <GraduationCap
            size={24}
            strokeWidth={2.4}
          />
        </div>

        <div className="brand-text">
          <div className="brand-name">
            AESA
          </div>

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

      {/* ================================================== */}
      {/* NAVIGATION */}
      {/* ================================================== */}

      <nav
        className="sidebar-nav"
        aria-label="Main navigation"
      >
        {/* ================================================= */}
        {/* MAIN ITEMS */}
        {/* ================================================= */}

        {mainItems.slice(0, 2).map(
          ({ label, icon: Icon, to }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""
                }`
              }
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          )
        )}

        {/* ================================================= */}
        {/* DATA IMPORT */}
        {/* ================================================= */}

        <div
          className={`nav-group ${isImportPage
            ? "nav-group-active"
            : ""
            }`}
        >
          <button
            type="button"
            className={`nav-item nav-group-button ${isImportPage ? "active-parent" : ""
              }`}
            onClick={() =>
              setDataImportOpen(
                (previous) => !previous
              )
            }
            aria-expanded={dataImportOpen}
          >
            <div className="nav-item-left">
              <FileSpreadsheet size={18} />

              <span>Data Import</span>
            </div>

            <ChevronDown
              size={16}
              className={`nav-chevron ${dataImportOpen
                ? "nav-chevron-open"
                : ""
                }`}
            />
          </button>

          {/* ================================================= */}
          {/* SUB MENU */}
          {/* ================================================= */}

          {dataImportOpen && (
            <div className="nav-submenu">
              <NavLink
                to="/import-attendance"
                className={({ isActive }) =>
                  `nav-subitem ${isActive ? "active" : ""
                  }`
                }
                onClick={onClose}
              >
                <FileSpreadsheet size={16} />

                <span>
                  Attendance Excel
                </span>
              </NavLink>

              <NavLink
                to="/parent-email-import"
                className={({ isActive }) =>
                  `nav-subitem ${isActive ? "active" : ""
                  }`
                }
                onClick={onClose}
              >
                <Users size={16} />

                <span>
                  Parent Contacts
                </span>
              </NavLink>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* REMAINING MAIN ITEMS */}
        {/* ================================================= */}

        {mainItems.slice(2).map(
          ({ label, icon: Icon, to }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""
                }`
              }
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          )
        )}

        {/* ================================================= */}
        {/* MANAGER PROFILE */}
        {/* ONLY VISIBLE TO CAMPUS MANAGER */}
        {/* ================================================= */}

        {isCampusManager && (
          <NavLink
            to="/manager-settings"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""
              }`
            }
            onClick={onClose}
          >
            <ShieldCheck size={18} />

            <span>
              Manager Settings
            </span>
          </NavLink>
        )}
      </nav>

      {/* ================================================== */}
      {/* LOGOUT */}
      {/* ================================================== */}

      <div className="sidebar-footer">
        <NavLink
          to="/login"
          className="logout-btn"
          onClick={onClose}
        >
          <LogOut size={18} />

          <span>Logout</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;