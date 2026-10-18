import { useState } from "react";
import "./Student-page.css";

const defaultSubjects = [
    {
        code: "CS201",
        name: "Data Structures & Algorithms",
        semester: 4,
        attended: 24,
        conducted: 30,
        percentage: "80.0",
        threshold: 23,
        status: "Good",
    },
    {
        code: "CS204",
        name: "Computer Networks",
        semester: 4,
        attended: 21,
        conducted: 28,
        percentage: "75.0",
        threshold: 21,
        status: "Good",
    },
    {
        code: "CS205",
        name: "Database Systems",
        semester: 4,
        attended: 26,
        conducted: 32,
        percentage: "81.3",
        threshold: 24,
        status: "Good",
    },
    {
        code: "EC206",
        name: "Microprocessors",
        semester: 4,
        attended: 18,
        conducted: 28,
        percentage: "64.3",
        threshold: 21,
        status: "Warning",
    },
    {
        code: "CS207",
        name: "Operating Systems",
        semester: 4,
        attended: 20,
        conducted: 24,
        percentage: "83.3",
        threshold: 18,
        status: "Good",
    },
    {
        code: "CS208",
        name: "Software Engineering",
        semester: 4,
        attended: 14,
        conducted: 28,
        percentage: "50.0",
        threshold: 21,
        status: "Critical",
    },
];

const historyBySubject = {
    CS207: [
        { date: "12 Oct", status: "Present" },
        { date: "10 Oct", status: "Present" },
        { date: "08 Oct", status: "Absent" },
        { date: "05 Oct", status: "Present" },
        { date: "03 Oct", status: "Present" },
    ],
};

function Badge({ tone = "neutral", children }) {
    return <span className={`badge badge--${tone}`}>{children}</span>;
}

function Progress({ value, tone = "good", label }) {
    return (
        <div
            className="progress"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(value)}
        >
            <span
                className={`progress__fill progress__fill--${tone}`}
                style={{ width: `${Math.min(100, Math.max(0, Number(value)))}%` }}
            />
        </div>
    );
}

function MiniStat({ label, value, tone = "" }) {
    return (
        <div className="mini-stat">
            <span>{label}</span>
            <strong className={tone ? `text-${tone}` : ""}>{value}</strong>
        </div>
    );
}

function SubjectCard({ subject, expanded, onHistory }) {
    const tone = subject.status.toLowerCase();

    return (
        <article className="card subject-card">
            <div className="row subject-card__heading">
                <div>
                    <h3>{subject.name}</h3>
                    <p className="subject-code">{subject.code}</p>
                </div>
                <Badge tone={tone}>{subject.status}</Badge>
            </div>

            <div className="attendance-detail">
                <div className="row small">
                    <span>Attended / Conducted</span>
                    <strong>
                        {subject.attended} / {subject.conducted}
                    </strong>
                </div>

                <Progress
                    value={subject.percentage}
                    tone={tone}
                    label={`${subject.name} attendance`}
                />

                <div className="row small">
                    <span>75% threshold</span>
                    <span>{subject.threshold} classes</span>
                </div>
            </div>

            <div className="row">
                <strong className="subject-percentage">
                    {subject.percentage}%
                </strong>
                <button
                    className="text-button"
                    onClick={onHistory}
                    aria-expanded={expanded}
                    aria-controls="attendance-history"
                >
                    View History
                    <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
                </button>
            </div>
        </article>
    );
}

export default function AttendFlow({
    subjects = defaultSubjects,
    onReport,
    onLogout,
}) {
    const [semester, setSemester] = useState(4);
    const [filter, setFilter] = useState("All Subjects");
    const [historyCode, setHistoryCode] = useState("CS207");

    const semesterSubjects = subjects.filter(
        (subject) => subject.semester === semester
    );

    const visibleSubjects = semesterSubjects.filter((subject) => {
        if (filter === "Good") return subject.status === "Good";
        if (filter === "Needs Attention") return subject.status !== "Good";
        return true;
    });

    const historySubject = semesterSubjects.find(
        (subject) => subject.code === historyCode
    );

    const history = historySubject
        ? historyBySubject[historySubject.code] ?? []
        : [];

    return (
        <div className="attendflow">
            <div className="dashboard">
                <header className="top-nav">
                    <a className="brand" href="#" aria-label="AttendFlow home">
                        <span className="brand-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path
                                    d="m3 9 9-5 9 5-9 5-9-5Zm4 3v5c3 3 7 3 10 0v-5M21 9v7"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </span>
                        <span className="brand-copy">
                            <strong>AttendFlow</strong>
                            <span className="portal-label">Student Portal</span>
                        </span>
                    </a>

                    <div className="profile">
                        <Badge tone="good">Squad 42</Badge>
                        <div className="profile-pill">
                            <span className="avatar">AR</span>
                            <div className="profile-copy">
                                <strong>Ashwin Raj</strong>
                                <span>ashwin.raj@kalvium.edu</span>
                            </div>
                            <button
                                className="logout-button"
                                aria-label="Log out"
                                onClick={onLogout}
                                disabled={!onLogout}
                            >
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path
                                        d="M10 5H5v14h5m5-11 4 4-4 4m-6-4h10"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>
                <main className="main-content">
                    <section className="hero">
                        <div className="hero-copy">
                            <h1>Welcome back, Ashwin 👋</h1>
                            <p>
                                Track your attendance progress and keep your records above
                                the 75% criteria.
                            </p>
                            <div className="safe-notice">
                                <span className="status-dot" />
                                Overall attendance is currently 82.4% · Safe zone
                            </div>
                        </div>
                    </section>

                    <section className="kpi-grid" aria-label="Attendance overview">
                        <article className="card overall-card">
                            <div className="row">
                                <h2 className="card-label">Overall Attendance</h2>
                                <Badge tone="good">Safe</Badge>
                            </div>

                            <strong className="overall-value">82.4%</strong>

                            <div className="attendance-detail">
                                <div className="row small">
                                    <span>Classes attended</span>
                                    <strong>98 / 119</strong>
                                </div>
                                <Progress value={82.4} label="Overall attendance" />
                                <div className="row small">
                                    <span>75% threshold</span>
                                    <span>89 classes</span>
                                </div>
                            </div>

                            <div className="mini-grid">
                                <MiniStat
                                    label="Absence margin"
                                    value="+9 classes"
                                    tone="good"
                                />
                                <MiniStat label="Next threshold" value="89 / 119" />
                            </div>
                        </article>
                        <article className="card kpi-card">
                            <div className="row">
                                <h2 className="card-label">Total Sessions Attended</h2>
                                <Badge tone="good">Safe</Badge>
                            </div>
                            <strong className="kpi-value">98</strong>
                            <p>
                                You have attended 98 sessions out of 119 total classes so far.
                            </p>
                            <div className="attendance-detail">
                                <div className="row small">
                                    <span>Classes attended</span>
                                    <strong>98 / 119</strong>
                                </div>
                                <Progress value={82.4} label="Total sessions attended" />
                            </div>
                        </article>

                        <article className="card kpi-card">
                            <div className="row">
                                <h2 className="card-label">Subjects Breakdown</h2>
                                <Badge>6 Subjects</Badge>
                            </div>
                            <strong className="kpi-value">6</strong>
                            <p>
                                4 subjects are above 75%, 1 needs attention, and 1 is critical.
                            </p>
                            <div className="mini-grid mini-grid--three">
                                <MiniStat label="Good" value="4" tone="good" />
                                <MiniStat label="Warning" value="1" tone="warning" />
                                <MiniStat label="Critical" value="1" tone="critical" />
                            </div>
                            <div className="attention-list small">
                                <div className="row">
                                    <span>Critical</span>
                                    <strong className="text-critical">1 subject</strong>
                                </div>
                                <div className="row">
                                    <span>Warning</span>
                                    <strong className="text-warning">1 subject</strong>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section aria-labelledby="subjects-title">
                        <div className="section-heading">
                            <div>
                                <h2 id="subjects-title">Core Subjects</h2>
                                <p>
                                    Review attendance health, recent history, and required follow-up.
                                </p>
                            </div>

                            <div className="subject-controls">
                                <div className="filter-group" aria-label="Filter subjects">
                                    {["All Subjects", "Needs Attention", "Good"].map((item) => (
                                        <button
                                            key={item}
                                            className={`filter-button ${filter === item ? "is-active" : ""
                                                }`}
                                            aria-pressed={filter === item}
                                            onClick={() => setFilter(item)}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>

                                <select
                                    className="semester-select"
                                    aria-label="Select semester"
                                    value={semester}
                                    onChange={(event) => {
                                        setSemester(Number(event.target.value));
                                        setHistoryCode(null);
                                    }}
                                >
                                    {Array.from({ length: 8 }, (_, index) => index + 1).map(
                                        (value) => (
                                            <option key={value} value={value}>
                                                Semester {value}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="subject-grid">
                            {visibleSubjects.map((subject) => (
                                <SubjectCard
                                    key={`${subject.semester}-${subject.code}`}
                                    subject={subject}
                                    expanded={historyCode === subject.code}
                                    onHistory={() =>
                                        setHistoryCode((current) =>
                                            current === subject.code ? null : subject.code
                                        )
                                    }
                                />
                            ))}
                        </div>

                        {!visibleSubjects.length && (
                            <div className="card empty-state" role="status">
                                {semesterSubjects.length
                                    ? "No subjects match this filter."
                                    : `No subject data available for Semester ${semester}.`}
                            </div>
                        )}
                    </section>

                    {historySubject && (
                        <section
                            className="card history-card"
                            id="attendance-history"
                            aria-labelledby="history-title"
                        >
                            <div className="section-heading">
                                <div>
                                    <h2 id="history-title">Recent Attendance History</h2>
                                    <p>
                                        Expanded state for {historySubject.name} ·{" "}
                                        {historySubject.code}
                                    </p>
                                </div>
                                <button
                                    className="text-button"
                                    onClick={() => setHistoryCode(null)}
                                >
                                    Collapse <span aria-hidden="true">⌃</span>
                                </button>
                            </div>

                            <div className="history-grid">
                                <div className="history-panel">
                                    <h3>Last 5 sessions</h3>
                                    {history.length ? (
                                        <ul className="session-list">
                                            {history.map((session) => (
                                                <li className="row" key={session.date}>
                                                    <span>{session.date}</span>
                                                    <Badge
                                                        tone={
                                                            session.status === "Present"
                                                                ? "good"
                                                                : "critical"
                                                        }
                                                    >
                                                        {session.status}
                                                    </Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>No session history available.</p>
                                    )}
                                </div>

                                <div className="history-panel history-notes">
                                    <h3>Attendance notes</h3>
                                    <p>
                                        {historySubject.code === "CS207"
                                            ? "No discrepancy reported for this subject. Recent attendance remains above the 75% threshold."
                                            : "No attendance notes available."}
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    <aside className="card support-callout">
                        <div>
                            <h2>Notice an attendance discrepancy?</h2>
                            <p>
                                If a class is marked incorrectly, report the issue to your
                                mentor and include the date, subject, and expected attendance
                                status.
                            </p>
                        </div>
                        <button
                            className="primary-button"
                            onClick={onReport}
                            disabled={!onReport}
                        >
                            Report to Mentor
                        </button>
                    </aside>
                </main>
            </div>
        </div>
    );
}
