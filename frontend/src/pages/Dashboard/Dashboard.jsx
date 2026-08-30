import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Mail,
  MoreHorizontal,
  UsersRound,
  Filter,
} from "lucide-react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

import "./Dashboard.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const statCardConfig = [
  {
    label: "Students",
    value: 0,
    change: "Live from student records",
    direction: "up",
    icon: UsersRound,
    tone: "blue",
  },
  {
    label: "Avg Attendance",
    value: "0%",
    change: "Live from attendance records",
    direction: "up",
    icon: CheckCircle2,
    tone: "green",
  },
  {
    label: "At Risk Students",
    value: 0,
    change: "Below 75% attendance",
    direction: "down",
    icon: AlertCircle,
    tone: "orange",
  },
  {
    label: "Alerts Sent",
    value: 0,
    change: "Imported student records",
    direction: "up",
    icon: Mail,
    tone: "purple",
  },
];

function StatCard({ card }) {
  const Icon = card.icon;

  const TrendIcon =
    card.direction === "up"
      ? ArrowUpRight
      : ArrowDownRight;

  return (
    <article className="stat-card">
      <div className={`stat-icon ${card.tone}`}>
        <Icon
          size={22}
          strokeWidth={2.2}
        />
      </div>

      <div className="stat-copy">
        <p>{card.label}</p>

        <h2>{card.value}</h2>

        <span
          className={
            card.direction === "down"
              ? "negative"
              : "positive"
          }
        >
          <TrendIcon
            size={13}
            strokeWidth={2.7}
          />

          {card.change}
        </span>
      </div>
    </article>
  );
}

function DistributionItem({ item }) {
  return (
    <div className="distribution-item">
      <div className="distribution-item-top">
        <div className="distribution-name">
          <span
            className="distribution-dot"
            style={{
              backgroundColor: item.fill,
            }}
          />

          <div>
            <strong>{item.name}</strong>

            <span>
              {item.description}
            </span>
          </div>
        </div>

        <div className="distribution-value">
          <strong>{item.value}</strong>

          <span>
            {item.percentage}%
          </span>
        </div>
      </div>

      <div className="distribution-progress">
        <span
          style={{
            width: `${item.percentage}%`,
            backgroundColor: item.fill,
          }}
        />
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] =
    useState(false);

  const [selectedSquad, setSelectedSquad] =
    useState("All");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(`${API_URL}/api/attendance/students`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to fetch students");
        }
        setStudents(result.students || []);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to fetch students");
      } finally {
        setLoading(false);
      }
    };

    void fetchStudents();
  }, []);

  const totalStudents = students.length;
  const averageAttendance = totalStudents
    ? students.reduce((total, student) => total + Number(student.attendance || 0), 0) / totalStudents
    : 0;
  const distribution = [
    { name: "Good", description: "75% and above", value: students.filter((student) => Number(student.attendance) >= 75).length, fill: "#25B86A" },
    { name: "Warning", description: "65% – 74%", value: students.filter((student) => Number(student.attendance) >= 65 && Number(student.attendance) < 75).length, fill: "#F3B62F" },
    { name: "Critical", description: "Below 65%", value: students.filter((student) => Number(student.attendance) < 65).length, fill: "#E64B4B" },
  ].map((item) => ({
    ...item,
    percentage: totalStudents ? Number(((item.value / totalStudents) * 100).toFixed(1)) : 0,
  }));

  const studentsNeedingAttention =
    distribution[1].value +
    distribution[2].value;

  const statCards = statCardConfig.map((card) => ({
    ...card,
    value: card.label === "Students"
      ? totalStudents
      : card.label === "Avg Attendance"
        ? `${averageAttendance.toFixed(1)}%`
        : card.label === "At Risk Students"
          ? studentsNeedingAttention
          : totalStudents,
  }));

  /*
   * FILTER STUDENTS
   *
   * If selectedSquad is "All",
   * show every student.
   *
   * Otherwise show only the
   * selected squad.
   */
  const filteredStudents =
    selectedSquad === "All"
      ? students
      : students.filter(
          (student) =>
            String(student.squad) === selectedSquad.replace("Squad ", "")
        );

  const attentionStudents = filteredStudents.filter(
    (student) => Number(student.attendance) < 75
  );

  /*
   * VIEW ALL
   *
   * Reset the squad filter and
   * close the dropdown.
   */
  const handleViewAll = () => {
    setSelectedSquad("All");
    setFilterOpen(false);
  };

  /*
   * FILTER BY SQUAD
   */
  const handleSquadFilter = (
    squad
  ) => {
    setSelectedSquad(squad);
    setFilterOpen(false);
  };

  return (
    <section
      className="dashboard-page"
      id="dashboard"
    >
      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">
            ATTENDANCE &amp; ALERT AUTOMATION
          </div>

          <h1>
            Good Morning, Mentor{" "}
            <span aria-hidden="true">
              👋
            </span>
          </h1>

          <p>
            Here&apos;s your attendance
            overview.
          </p>
        </div>

        <button
          className="mobile-date"
          type="button"
        >
          <CalendarDays size={16} />

          <span>
            May 12 – May 18, 2024
          </span>

          <ChevronDown size={14} />
        </button>
      </div>

      {/* =====================================
          STATISTICS
      ====================================== */}

      <div className="stats-grid">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            card={card}
          />
        ))}
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {/* =====================================
          ATTENDANCE DISTRIBUTION
      ====================================== */}

      <article className="panel distribution-panel">
        <div className="distribution-header">
          <div>
            <div className="section-kicker">
              ATTENDANCE HEALTH
            </div>

            <h2>
              Attendance Distribution
            </h2>

            <p>
              Current attendance status
              across all active students
            </p>
          </div>

          <div className="distribution-date">
            <CalendarDays size={15} />

            <span>
              May 12 – May 18, 2024
            </span>

            <ChevronDown size={13} />
          </div>
        </div>

        <div className="distribution-main">

          {/* DONUT CHART */}

          <div className="donut-section">
            <div className="donut-chart">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="66%"
                    outerRadius="88%"
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                    stroke="#FFFFFF"
                    strokeWidth={4}
                  >
                    {distribution.map(
                      (item) => (
                        <Cell
                          key={item.name}
                          fill={item.fill}
                        />
                      )
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="donut-center">
                <span>
                  Total Students
                </span>

                <strong>
                  {totalStudents}
                </strong>

                <small>
                  100% population
                </small>
              </div>
            </div>
          </div>

          {/* DISTRIBUTION DETAILS */}

          <div className="distribution-details">
            <div className="distribution-summary">
              <div>
                <span className="summary-label">
                  Overall healthy
                </span>

                <strong>{distribution[0].percentage}%</strong>
              </div>

              <div className="summary-status">
                <CheckCircle2 size={17} />

                <span>
                  Majority of students
                  are above the safe
                  attendance level.
                </span>
              </div>
            </div>

            <div className="distribution-list">
              {distribution.map(
                (item) => (
                  <DistributionItem
                    key={item.name}
                    item={item}
                  />
                )
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SUMMARY */}

        <div className="distribution-footer">

          <div className="distribution-footer-item good">
            <div className="footer-icon">
              <CheckCircle2 size={17} />
            </div>

            <div>
              <span>
                Healthy Students
              </span>

                <strong>{distribution[0].value}</strong>
            </div>
          </div>

          <div className="distribution-footer-item warning">
            <div className="footer-icon">
              <AlertCircle size={17} />
            </div>

            <div>
              <span>
                Warning Students
              </span>

                <strong>{distribution[1].value}</strong>
            </div>
          </div>

          <div className="distribution-footer-item critical">
            <div className="footer-icon">
              <AlertCircle size={17} />
            </div>

            <div>
              <span>
                Critical Students
              </span>

                <strong>{distribution[2].value}</strong>
            </div>
          </div>

          <div className="distribution-footer-item attention">
            <div className="footer-icon">
              <UsersRound size={17} />
            </div>

            <div>
              <span>
                Need Attention
              </span>

              <strong>
                {studentsNeedingAttention}
              </strong>
            </div>
          </div>

        </div>
      </article>

      {/* =====================================
          STUDENTS REQUIRING ATTENTION
      ====================================== */}

      <article className="panel attention-panel">

        {/* HEADER */}

        <div className="attention-header">

          {/* LEFT - TITLE */}

          <div className="attention-title">
            <h2>
              Students Requiring
              Attention
            </h2>

            <p>
              Students currently below
              the healthy attendance
              threshold
            </p>
          </div>

          {/* RIGHT - FILTER + VIEW ALL */}

          <div className="attention-actions">

            {/* FILTER */}

            <div className="filter-wrap">

              <button
                type="button"
                className="outline-button"
                onClick={() =>
                  setFilterOpen(
                    (value) =>
                      !value
                  )
                }
                aria-expanded={
                  filterOpen
                }
              >
                <Filter
                  size={16}
                  strokeWidth={2.2}
                />

                <span>
                  Filter
                </span>

                <ChevronDown
                  size={14}
                />
              </button>

              {/* FILTER DROPDOWN */}

              {filterOpen && (
                <div className="filter-menu">

                  <button
                    type="button"
                    className={
                      selectedSquad ===
                      "Squad 138"
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      handleSquadFilter(
                        "Squad 138"
                      )
                    }
                  >
                    Squad 138
                  </button>

                  <button
                    type="button"
                    className={
                      selectedSquad ===
                      "Squad 139"
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      handleSquadFilter(
                        "Squad 139"
                      )
                    }
                  >
                    Squad 139
                  </button>

                </div>
              )}

            </div>

            {/* VIEW ALL */}

            <button
              type="button"
              className="outline-button"
              onClick={
                handleViewAll
              }
            >
              View All
            </button>

          </div>
        </div>

        {/* =====================================
            STUDENT TABLE
        ====================================== */}

        <div className="student-table-wrap">

          <table className="student-table">

            <thead>
              <tr>
                <th>
                  Student
                </th>

                <th>
                  Squad
                </th>

                <th>
                  Overall Attendance
                </th>

                <th>
                  Status
                </th>

                <th>
                  Last Updated
                </th>

                <th aria-label="Action" />
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <div className="empty-state">Loading students...</div>
              ) : attentionStudents.map(
                (student) => (

                  <tr
                    key={student.id}
                  >

                    {/* STUDENT */}

                    <td>

                      <div className="student-name">

                        {/* CIRCLE DIRECTLY
                            IN FRONT OF NAME */}

                        <div className="student-avatar">
                          {student.name?.trim()
                            .split(" ")
                            .map(
                              (word) =>
                                word[0]
                            )
                            .join("")
                            .toUpperCase()}
                        </div>

                        <strong>
                          {student.name || "Unnamed student"}
                        </strong>

                      </div>

                    </td>

                    {/* SQUAD */}

                    <td>

                      <span className="squad-pill">
                        {student.squad || "Unassigned"}
                      </span>

                    </td>

                    {/* ATTENDANCE */}

                    <td>

                      <div className="attendance-cell">

                        <strong>{Number(student.attendance || 0).toFixed(2)}%</strong>

                        <div className="progress-track">

                          <span
                            className={
                              student.attendance <
                              65
                                ? "critical-progress"
                                : "warning-progress"
                            }
                            style={{
                              width: `${student.attendance}%`,
                            }}
                          />

                        </div>

                      </div>

                    </td>

                    {/* STATUS */}

                    <td>

                      <span
                        className={`status-pill ${Number(student.attendance) < 65 ? "critical" : "warning"}`}
                      >
                        {Number(student.attendance) < 65 ? "Critical" : "Warning"}
                      </span>

                    </td>

                    {/* LAST UPDATED */}

                    <td className="updated-cell">

                      <Clock3
                        size={13}
                      />

                      {student.updated_at ? new Date(student.updated_at).toLocaleDateString() : "Not yet imported"}

                    </td>

                    {/* VIEW */}

                    <td>

                      <button
                        className="student-action"
                        type="button"
                        onClick={() => navigate(`/students?student=${encodeURIComponent(student.id)}`)}
                      >
                        View Details
                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

          {/* EMPTY STATE */}

          {attentionStudents.length ===
            0 && (
              <div className="empty-state">
                {loading ? "Loading students..." : "No students need attention for this squad."}
              </div>
            )}

        </div>

        {/* ATTENTION FOOTER */}

        <div className="attention-footer">

          <span>

            <MoreHorizontal
              size={16}
            />

            Showing{" "}
              {
                attentionStudents.length
              }{" "}
            of {studentsNeedingAttention} at-risk
            students

          </span>

          <button
            type="button"
            onClick={
              handleViewAll
            }
          >
            Open Students
          </button>

        </div>

      </article>

      {/* =====================================
          FOOTER
      ====================================== */}

      <footer className="dashboard-footer">
        © 2024 AESA — Attendance &amp;
        Alert Automation System. All
        rights reserved.
      </footer>

    </section>
  );
}

export default Dashboard;