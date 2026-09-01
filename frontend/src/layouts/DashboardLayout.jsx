import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";

import Sidebar from "../components/Sidebar";
import "./DashboardLayout.css";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={22} />
        </button>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;