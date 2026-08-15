import React from "react";
import "./Navbar.css";

function Navbar() {
  return (
    <header className="navbar">

      <button className="menu-button">
        ☰
      </button>

      <div className="navbar-right">

        <button className="notification">
          🔔
        </button>

        <div className="profile">
          <div className="avatar">
            M
          </div>

          <div>
            <strong>Mentor</strong>
            <p>mentor@aesea.edu</p>
          </div>
        </div>

      </div>

    </header>
  );
}

export default Navbar;