import { useState } from "react";
import {
  Search,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  MessageSquare,
  X,
} from "lucide-react";

import "./CommunicationHistory.css";

const communicationData = [
  {
    id: "MSG-20260817-001",
    date: "Aug 17, 2026",
    time: "09:42 AM",
    type: "Email",
    recipient: "sarah.j@student.edu",
    name: "Sarah Jenkins",
    message: "Attendance Alert - You missed your Intro to CS class.",
    status: "Delivered",
  },
  {
    id: "SMS-20260817-002",
    date: "Aug 17, 2026",
    time: "09:30 AM",
    type: "SMS",
    recipient: "+91 XXXXXXXX",
    name: "John Mathew",
    message: "Attendance Reminder - Please check your attendance.",
    status: "Delivered",
  },
  {
    id: "MSG-20260817-003",
    date: "Aug 17, 2026",
    time: "09:20 AM",
    type: "Email",
    recipient: "student2@student.edu",
    name: "David Kumar",
    message: "Attendance Warning - Your attendance is below 75%.",
    status: "Failed",
  },
  {
    id: "SMS-20260817-004",
    date: "Aug 17, 2026",
    time: "09:10 AM",
    type: "SMS",
    recipient: "+91 XXXXXXXX",
    name: "Priya",
    message: "Attendance Reminder - Please check your attendance.",
    status: "Pending",
  },
];

function CommunicationHistory() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedMessage, setSelectedMessage] = useState(null);

  const filteredData = communicationData.filter((item) => {
    const matchesTab =
      activeTab === "All" || item.type === activeTab;

    const matchesStatus =
      statusFilter === "All" ||
      item.status === statusFilter;

    const searchText = search.toLowerCase();

    const matchesSearch =
      item.recipient.toLowerCase().includes(searchText) ||
      item.name.toLowerCase().includes(searchText) ||
      item.message.toLowerCase().includes(searchText) ||
      item.id.toLowerCase().includes(searchText);

    return matchesTab && matchesStatus && matchesSearch;
  });

  return (
    <div className="communication-history">

      {/* Page Header */}
      <div className="communication-header">
        <h1>Communication History</h1>

        <p>
          Track and monitor all email and SMS notifications
          sent through Attend Flow.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="communication-stats">

        <StatCard
          title="Total Sent"
          value="1,248"
          subtitle="All communications"
          icon={<Send size={20} />}
        />

        <StatCard
          title="Delivered"
          value="1,172"
          subtitle="93.9% delivery rate"
          icon={<CheckCircle size={20} />}
          type="success"
        />

        <StatCard
          title="Failed"
          value="42"
          subtitle="3.4% failed"
          icon={<AlertCircle size={20} />}
          type="error"
        />

        <StatCard
          title="Pending"
          value="34"
          subtitle="2.7% pending"
          icon={<Clock size={20} />}
          type="warning"
        />

      </div>

      {/* Main History Container */}
      <div className="history-container">

        {/* Tabs */}
        <div className="history-tabs">
          {["All", "Email", "SMS"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="history-filters">

          <div className="search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search recipient, message, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">Status: All</option>
            <option value="Sent">Sent</option>
            <option value="Delivered">Delivered</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
            <option value="Bounced">Bounced</option>
          </select>

          <button
            className="clear-button"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
              setActiveTab("All");
            }}
          >
            Clear Filters
          </button>

        </div>

        {/* Table */}
        <div className="history-table-wrapper">

          <table className="history-table">

            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Message Details</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredData.map((item) => (
                <tr key={item.id}>

                  <td>
                    {item.date}
                    <span>{item.time}</span>
                  </td>

                  <td>
                    <div className="communication-type">
                      {item.type === "Email" ? (
                        <Mail size={17} />
                      ) : (
                        <MessageSquare size={17} />
                      )}

                      {item.type}
                    </div>
                  </td>

                  <td>
                    <strong>{item.recipient}</strong>
                    <span>{item.name}</span>
                  </td>

                  <td className="message-cell">
                    {item.message}
                  </td>

                  <td>
                    <StatusBadge status={item.status} />
                  </td>

                  <td>
                    <button
                      className="view-button"
                      onClick={() =>
                        setSelectedMessage(item)
                      }
                    >
                      View
                    </button>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

          {filteredData.length === 0 && (
            <div className="empty-state">
              <Mail size={40} />

              <h3>No communication history</h3>

              <p>
                There are no email or SMS notifications
                matching your selected filters.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Details Drawer */}
      {selectedMessage && (
        <div className="drawer-backdrop">

          <div className="details-drawer">

            <div className="drawer-header">

              <h2>Communication Details</h2>

              <button
                onClick={() => setSelectedMessage(null)}
              >
                <X size={20} />
              </button>

            </div>

            <div className="drawer-content">

              <DetailItem
                label="Channel"
                value={selectedMessage.type}
              />

              <DetailItem
                label="Recipient"
                value={selectedMessage.recipient}
              />

              <DetailItem
                label="Message"
                value={selectedMessage.message}
              />

              <DetailItem
                label="Status"
                value={selectedMessage.status}
              />

              <DetailItem
                label="Sent At"
                value={`${selectedMessage.date} • ${selectedMessage.time}`}
              />

              <DetailItem
                label="Message ID"
                value={selectedMessage.id}
              />

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  type = "",
}) {
  return (
    <div className={`stat-card ${type}`}>

      <div>
        <p>{title}</p>
        <h2>{value}</h2>
        <span>{subtitle}</span>
      </div>

      <div className="stat-icon">
        {icon}
      </div>

    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`status-badge ${status.toLowerCase()}`}
    >
      {status}
    </span>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

export default CommunicationHistory;