import { useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import "./Navbar.css";

function Navbar({ onMenuClick }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  const handleYearChange = (direction) => {
    setSelectedYear(selectedYear + direction);
  };

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
        <div className="date-picker-container">
          <button
            type="button"
            className="top-date"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <CalendarDays size={16} />

            <span>
              {selectedDate.toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>

            <ChevronDown size={14} />
          </button>

          {showCalendar && (
            <div className="calendar-dropdown">
              <div className="year-selector">
                <button
                  type="button"
                  className="year-nav"
                  onClick={() => handleYearChange(-1)}
                  aria-label="Previous year"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="year-display">{selectedYear}</span>
                <button
                  type="button"
                  className="year-nav"
                  onClick={() => handleYearChange(1)}
                  aria-label="Next year"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <Calendar
                value={selectedDate}
                onChange={handleDateChange}
                maxDate={new Date()}
              />
            </div>
          )}
        </div>

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