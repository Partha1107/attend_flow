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
} from "lucide-react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

import "./Dashboard.css";

const statCards = [
  {
    label: "Students",
    value: "156",
    change: "5 from last week",
    direction: "up",
    icon: UsersRound,
    tone: "blue",
  },
  {
    label: "Avg Attendance",
    value: "82.4%",
    change: "2.6% from last week",
    direction: "up",
    icon: CheckCircle2,
    tone: "green",
  },
  {
    label: "At Risk Students",
    value: "24",
    change: "4 from last week",
    direction: "down",
    icon: AlertCircle,
    tone: "orange",
  },
  {
    label: "Alerts Sent",
    value: "118",
    change: "18 from last week",
    direction: "up",
    icon: Mail,
    tone: "purple",
  },
];

const distribution = [
  {
    name: "Good",
    description: "75% and above",
    value: 102,
    percentage: 65.4,
    fill: "#25B86A",
  },
  {
    name: "Warning",
    description: "65% – 74%",
    value: 32,
    percentage: 20.5,
    fill: "#F3B62F",
  },
  {
    name: "Critical",
    description: "Below 65%",
    value: 22,
    percentage: 14.1,
    fill: "#E64B4B",
  },
];

const students = [
  {
    name: "Student A",
    squad: "Squad 138",
    attendance: 61,
    updated: "May 18, 2024",
    status: "Critical",
  },
  {
    name: "Student B",
    squad: "Squad 140",
    attendance: 68,
    updated: "May 18, 2024",
    status: "Warning",
  },
  {
    name: "Student C",
    squad: "Squad 136",
    attendance: 72,
    updated: "May 18, 2024",
    status: "Warning",
  },
  {
    name: "Student D",
    squad: "Squad 139",
    attendance: 59,
    updated: "May 18, 2024",
    status: "Critical",
  },
  {
    name: "Student E",
    squad: "Squad 142",
    attendance: 64,
    updated: "May 18, 2024",
    status: "Critical",
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
        <Icon size={22} strokeWidth={2.2} />
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
          <strong>
            {item.value}
          </strong>

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
  const totalStudents = distribution.reduce(
    (total, item) => total + item.value,
    0
  );

  const studentsNeedingAttention =
    distribution[1].value +
    distribution[2].value;

  return (
    <section
      className="dashboard-page"
      id="dashboard"
    >
      {/* PAGE HEADER */}

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
            Here&apos;s your attendance overview.
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

      {/* STATISTICS */}

      <div className="stats-grid">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            card={card}
          />
        ))}
      </div>

      {/* ATTENDANCE DISTRIBUTION */}

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
          {/* DONUT */}

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

                <strong>
                  65.4%
                </strong>
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

              <strong>
                102
              </strong>
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

              <strong>
                32
              </strong>
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

              <strong>
                22
              </strong>
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

      {/* STUDENTS REQUIRING ATTENTION */}

      <article className="panel attention-panel">
        <div className="attention-header">
          <div>
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

          <button
            type="button"
            className="view-all-button"
          >
            View All
          </button>
        </div>

        <div className="student-table-wrap">
          <table className="student-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Squad</th>
                <th>
                  Overall Attendance
                </th>
                <th>Status</th>
                <th>Last Updated</th>
                <th aria-label="Action" />
              </tr>
            </thead>

            <tbody>
              {students.map(
                (student) => (
                  <tr key={student.name}>
                    <td>
                      <div className="student-name">
                        <div className="student-avatar">
                          {
                            student.name.split(
                              " "
                            )[1]
                          }
                        </div>

                        <strong>
                          {student.name}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <span className="squad-pill">
                        {student.squad}
                      </span>
                    </td>

                    <td>
                      <div className="attendance-cell">
                        <strong>
                          {
                            student.attendance
                          }%
                        </strong>

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

                    <td>
                      <span
                        className={`status-pill ${student.status.toLowerCase()}`}
                      >
                        {student.status}
                      </span>
                    </td>

                    <td className="updated-cell">
                      <Clock3 size={13} />

                      {student.updated}
                    </td>

                    <td>
                      <button
                        className="student-action"
                        type="button"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="attention-footer">
          <span>
            <MoreHorizontal size={16} />

            Showing 5 of 24 at-risk
            students
          </span>

          <button type="button">
            Open Students
          </button>
        </div>
      </article>

      {/* FOOTER */}

      <footer className="dashboard-footer">
        © 2024 AESA — Attendance &amp;
        Alert Automation System. All
        rights reserved.
      </footer>
    </section>
  );
}

export default Dashboard;