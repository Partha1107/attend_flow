import { useMemo, useState } from "react";

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
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./Dashboard.css";

const weeklyAttendance = [
  { week: "Apr 01", value: 78.1 },
  { week: "Apr 08", value: 79.4 },
  { week: "Apr 15", value: 81.2 },
  { week: "Apr 22", value: 82.0 },
  { week: "Apr 29", value: 80.3 },
  { week: "May 06", value: 81.6 },
  { week: "May 13", value: 82.4 },
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

const distribution = [
  {
    name: "Good",
    description: "75% and above",
    value: 102,
    percentage: 65.4,
    fill: "#27b36a",
  },
  {
    name: "Warning",
    description: "65% – 74%",
    value: 32,
    percentage: 20.5,
    fill: "#f4b52d",
  },
  {
    name: "Critical",
    description: "Below 65%",
    value: 22,
    percentage: 14.1,
    fill: "#e94d4d",
  },
];

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

function AttendanceTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <span>{label}</span>

      <strong>
        {payload[0].value}%
      </strong>
    </div>
  );
}

function Dashboard() {
  const [range, setRange] =
    useState("Last 6 Weeks");

  const [dateRange, setDateRange] =
    useState("May 12 – May 18, 2024");

  const chartData = useMemo(() => {
    if (range === "Last 4 Weeks") {
      return weeklyAttendance.slice(-5);
    }

    if (range === "Last 8 Weeks") {
      return [
        {
          week: "Mar 18",
          value: 76.9,
        },
        {
          week: "Mar 25",
          value: 77.6,
        },
        ...weeklyAttendance,
      ];
    }

    return weeklyAttendance;
  }, [range]);

  return (
    <section
      className="dashboard-page"
      id="dashboard"
    >
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
          onClick={() =>
            setDateRange(
              "May 12 – May 18, 2024"
            )
          }
        >
          <CalendarDays size={16} />

          {dateRange}

          <ChevronDown size={14} />
        </button>
      </div>

      <div className="stats-grid">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            card={card}
          />
        ))}
      </div>

      <div className="analytics-grid">
        <article className="panel attendance-panel">
          <div className="panel-header">
            <div>
              <h2>
                Attendance Overview
              </h2>

              <p>
                Weekly average attendance
              </p>
            </div>

            <select
              value={range}
              onChange={(event) =>
                setRange(
                  event.target.value
                )
              }
            >
              <option>
                Last 6 Weeks
              </option>

              <option>
                Last 4 Weeks
              </option>

              <option>
                Last 8 Weeks
              </option>
            </select>
          </div>

          <div className="line-chart-wrap">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={chartData}
                margin={{
                  top: 24,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="attendanceFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#d71920"
                      stopOpacity={0.22}
                    />

                    <stop
                      offset="100%"
                      stopColor="#d71920"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#edf0f3"
                  vertical={false}
                />

                <XAxis
                  dataKey="week"
                  tick={{
                    fill: "#8a93a3",
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                  dy={9}
                />

                <YAxis
                  domain={[0, 100]}
                  ticks={[
                    0,
                    25,
                    50,
                    75,
                    100,
                  ]}
                  tick={{
                    fill: "#8a93a3",
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={
                    <AttendanceTooltip />
                  }
                  cursor={{
                    stroke: "#e9edf2",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#d71920"
                  strokeWidth={2.5}
                  fill="url(#attendanceFill)"
                  dot={{
                    r: 3.5,
                    fill: "#fff",
                    stroke: "#d71920",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 5,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel distribution-panel">
          <div className="panel-header">
            <div>
              <h2>
                Attendance Distribution
              </h2>

              <p>
                Current student attendance
                status
              </p>
            </div>
          </div>

          <div className="distribution-body">
            <div className="donut-wrap">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="54%"
                    outerRadius="78%"
                    paddingAngle={1.5}
                    stroke="#fff"
                    strokeWidth={2}
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
                <strong>156</strong>
                <span>Students</span>
              </div>
            </div>

            <div className="distribution-list">
              {distribution.map(
                (item) => (
                  <div
                    className="distribution-row"
                    key={item.name}
                  >
                    <div className="distribution-label">
                      <span
                        className="legend-dot"
                        style={{
                          background:
                            item.fill,
                        }}
                      />

                      <div>
                        <strong>
                          {item.name}
                        </strong>

                        <span>
                          {item.description}
                        </span>
                      </div>
                    </div>

                    <div className="distribution-number">
                      <strong>
                        {item.value}
                      </strong>

                      <span>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="distribution-total">
            <span>Total Students</span>
            <strong>156</strong>
          </div>
        </article>
      </div>

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

      <footer className="dashboard-footer">
        © 2024 AESA — Attendance &amp;
        Alert Automation System. All
        rights reserved.
      </footer>
    </section>
  );
}

export default Dashboard;