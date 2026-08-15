import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="logo">
        <h2>SMART</h2>
        <p>Attendance & Merit<br />Email automation</p>
      </div>

      <nav className="sidebar-menu">

        <Link to="/dashboard">Dashboard</Link>

        <div className="menu-section">
          <Link to="/import-attendance">Attendance</Link>
          <Link to="/import-attendance" className="submenu">Import Excel</Link>
          <a href="#" className="submenu">Attendance Records</a>
        </div>

        <a href="#">Students</a>
        <a href="#">Alerts</a>
        <a href="#">Communications</a>
        <a href="#">Analytics</a>
        <a href="#">Settings</a>

      </nav>

      <div className="help-box">
        <h4>Need Help?</h4>
        <p>Contact support if you need any help</p>
        <button>Contact Support</button>
      </div>

    </aside>
  );
}

export default Sidebar;