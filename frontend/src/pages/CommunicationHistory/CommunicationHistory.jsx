import { useEffect, useState } from "react";
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

const API_URL = import.meta.env.VITE_API_URL;

function CommunicationHistory() {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/email-automation/records`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Failed to fetch history");
        setHistory((result.data || []).map((record) => ({
          ...record,
          date: new Date(record.sent_at).toLocaleDateString(),
          time: new Date(record.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: record.communication_type || "Email",
          recipient: record.parent_email,
          name: record.student_name,
          subject: record.subject || "Attendance Alert",
          message: record.message || "Attendance email sent successfully.",
          status: record.status,
        })));
      } catch (fetchError) {
        setError(fetchError.message || "Failed to fetch communication history");
      }
    };

    fetchHistory();
  }, []);

  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedMessage, setSelectedMessage] = useState(null);

  const filteredData = history.filter((item) => {
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

      return (
        matchesTab &&
        matchesStatus &&
        matchesSearch
      );
    });

  const sentCount = history.filter((item) => item.status === "Sent").length;
  const failedCount = history.filter((item) => item.status === "Failed").length;
  const pendingCount = history.filter((item) => item.status === "Pending").length;

  if (error) {
    console.error(error);
  }
return (
  <div className="communication-history">

    {/* Page Header */}
    <div className="communication-header">
      <h1>Communication History</h1>

      {error && <p className="records-error">{error}</p>}

      <p>
        Track and monitor all email and SMS notifications
        sent through Attend Flow.
      </p>
    </div>

    {/* Summary Cards */}
    <div className="communication-stats">

      <StatCard
        title="Total Sent"
        value={sentCount}
        subtitle="Successful emails"
        icon={<Send size={20} />}
      />

      <StatCard
        title="Delivered"
        value={sentCount}
        subtitle="Confirmed by Brevo"
        icon={<CheckCircle size={20} />}
        type="success"
      />

      <StatCard
        title="Failed"
        value={failedCount}
        subtitle="Not sent"
        icon={<AlertCircle size={20} />}
        type="error"
      />

      <StatCard
        title="Pending"
        value={pendingCount}
        subtitle="Awaiting action"
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
                  <strong>{item.subject}</strong>
                  <span>{item.message}</span>
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