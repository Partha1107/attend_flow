import {
  Bell,
  CalendarDays,
  ChevronDown,
  Menu,
} from "lucide-react";

import "./Navbar.css";

function Navbar({ onMenuClick }) {
  return (
    <header className="navbar">
      <button
        type="button"
        className="menu-button"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu size={22} />
      </button>

      <div className="navbar-right">
        <button
          type="button"
          className="top-date"
        >
          <CalendarDays size={16} />

          <span>
            May 12 – May 18, 2024
          </span>

          <ChevronDown size={14} />
        </button>

        <button
          type="button"
          className="notification"
          aria-label="Notifications"
        >
          <Bell size={19} />

          <span className="notification-count">
            3
          </span>
        </button>

        <div className="profile">
          <div className="avatar">
            M
          </div>

          <div className="profile-copy">
            <strong>Mentor</strong>
            <span>mentor@aesa.edu</span>
          </div>

          <ChevronDown
            size={15}
            className="profile-chevron"
          />
        </div>
      </div>
    </header>
  );
}

export default Navbar;