import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Student-page.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getAuthHeaders = async () => {
    if (!supabase) {
        throw new Error("Supabase is not configured.");
    }

    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        throw new Error(error.message);
    }

    if (!session?.access_token) {
        throw new Error("You are not authenticated.");
    }

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
    };
};

const buildSubjectStatus = (percentage) => {
    if (percentage >= 75) return "Good";
    if (percentage >= 65) return "Warning";
    return "Critical";
};

const parseSemester = (value) => {
    const match = String(value ?? "").match(/\d+/);
    return match ? Number(match[0]) : null;
};

const normalizeSubject = (record) => {
    const attended = Number(record.attended || 0);
    const conducted = Number(record.conducted || 0);
    const percentage = conducted > 0 ? (attended / conducted) * 100 : 0;

    return {
        ...record,
        semester: parseSemester(record.semester),
        attended,
        conducted,
        percentage: percentage.toFixed(1),
        threshold: Math.max(1, Math.ceil(conducted * 0.75)),
        status: buildSubjectStatus(percentage),
    };
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

function SubjectCard({ subject }) {
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
            </div>
        </article>
    );
}

export default function AttendFlow({ onReport, onLogout }) {
    const [student, setStudent] = useState(null);
    const [liveSubjects, setLiveSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        const loadStudentData = async () => {
            try {
                if (!supabase) throw new Error("Supabase is not configured.");

                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;
                if (!userData?.user) throw new Error("You are not signed in.");

                const user = userData.user;
                const headers = await getAuthHeaders();

                const attendanceResponse = await fetch(`${API_URL}/api/attendance/me`, {
                    method: "GET",
                    headers,
                });

                const attendanceResult = await attendanceResponse.json();
                if (!attendanceResponse.ok) {
                    throw new Error(attendanceResult.message || "Unable to load student attendance.");
                }

                const currentStudent = attendanceResult.student;
                const attendanceRecords = Array.isArray(attendanceResult.records)
                    ? attendanceResult.records
                    : [];

                const bySubject = new Map();

                attendanceRecords
                    .filter((record) => {
                        return String(record.student_id || record.students?.id) === String(currentStudent.id);
                    })
                    .forEach((record) => {
                        const subjectName =
                            record?.subjects?.name ||
                            record?.subject_name;

                        const subjectCode =
                            record?.subject_code ||
                            record?.subject_id ||
                            record?.subjectId ||
                            subjectName;

                        if (!subjectName && !subjectCode) return;

                        const semester = record?.semester ?? "";
                        const key = `${subjectCode}-${subjectName}-${semester}`;
                        const item = bySubject.get(key) || {
                            code: String(subjectCode || subjectName),
                            name: String(subjectName || subjectCode),
                            semester,
                            attended: 0,
                            conducted: 0,
                        };

                        item.attended += Number(
                            record?.sessions_attended ??
                            record?.total_sessions_attended ??
                            record?.attended ??
                            0
                        );
                        item.conducted += Number(
                            record?.sessions_conducted ??
                            record?.total_sessions_conducted ??
                            record?.conducted ??
                            0
                        );

                        bySubject.set(key, item);
                    });

                const normalizedSubjects = Array.from(bySubject.values()).map(normalizeSubject);

                setStudent({
                    ...currentStudent,
                    name:
                        currentStudent?.name ||
                        user.email,
                    email: user.email || currentStudent?.email || "",
                    squad: currentStudent?.squad || "",
                });

                setLiveSubjects(normalizedSubjects);
            } catch (error) {
                console.error("Student dashboard load error:", error);
                setLoadError(error.message || "Unable to load attendance data.");
                setLiveSubjects([]);
            } finally {
                setLoading(false);
            }
        };

        loadStudentData();
    }, []);

    const dashboardSubjects = liveSubjects;

    const allSemesters = useMemo(
        () =>
            Array.from(
                new Set(dashboardSubjects.map((subject) => subject.semester).filter(Number.isInteger))
            ).sort((a, b) => a - b),
        [dashboardSubjects]
    );

    const [selectedSemester, setSelectedSemester] = useState(null);
    const semester = allSemesters.includes(selectedSemester)
        ? selectedSemester
        : allSemesters[0] ?? null;
    const [filter, setFilter] = useState("All Subjects");

    const semesterSubjects = dashboardSubjects.filter(
        (subject) => semester === null || subject.semester === semester
    );

    const visibleSubjects = semesterSubjects.filter((subject) => {
        if (filter === "Good") return subject.status === "Good";
        if (filter === "Needs Attention") return subject.status !== "Good";
        return true;
    });

    const totalClasses = semesterSubjects.reduce(
        (sum, subject) => sum + Number(subject.conducted || 0),
        0
    );
    const totalAttended = semesterSubjects.reduce(
        (sum, subject) => sum + Number(subject.attended || 0),
        0
    );
    const overallAttendance = totalClasses
        ? (totalAttended / totalClasses) * 100
        : 0;
    const thresholdClasses = totalClasses
        ? Math.floor(totalClasses * 0.75)
        : 0;
    const absenceMargin = totalAttended - thresholdClasses;
    const nextThreshold = `${thresholdClasses} / ${totalClasses}`;

    const breakdownCounts = semesterSubjects.reduce(
        (accumulator, subject) => {
            const statusKey = subject.status || "Good";
            accumulator[statusKey] = (accumulator[statusKey] || 0) + 1;
            return accumulator;
        },
        { Good: 0, Warning: 0, Critical: 0 }
    );

    const totalSubjectCount = semesterSubjects.length;
    const safeStatus = overallAttendance >= 75 ? "Safe" : "Warning";

    if (loading || loadError || !student) {
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
                    </header>
                    <main className="main-content">
                        <div className="card empty-state" role="status">
                            {loading ? "Loading attendance data..." : loadError || "Student profile unavailable."}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

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
                        <Badge tone="good">{student.squad}</Badge>
                        <div className="profile-pill">
                            <span className="avatar">
                                {student.name
                                    .split(" ")
                                    .map((part) => part[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                            </span>
                            <div className="profile-copy">
                                <strong>{student.name}</strong>
                                <span>{student.email}</span>
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
                            <h1>Welcome back, {student.name.split(" ")[0]} 👋</h1>
                            <p>
                                Track your attendance progress and keep your records above
                                the 75% criteria.
                            </p>
                            <div className="safe-notice">
                                <span className="status-dot" />
                                Overall attendance is currently {overallAttendance.toFixed(1)}% · {safeStatus === "Safe" ? "Safe zone" : "Needs attention"}
                            </div>
                        </div>
                    </section>

                    <section className="kpi-grid" aria-label="Attendance overview">
                        <article className="card overall-card">
                            <div className="row">
                                <h2 className="card-label">Overall Attendance</h2>
                                <Badge tone={safeStatus === "Safe" ? "good" : "warning"}>{safeStatus}</Badge>
                            </div>

                            <strong className="overall-value">{overallAttendance.toFixed(1)}%</strong>

                            <div className="attendance-detail">
                                <div className="row small">
                                    <span>Classes attended</span>
                                    <strong>{totalAttended} / {totalClasses}</strong>
                                </div>
                                <Progress value={overallAttendance} label="Overall attendance" />
                                <div className="row small">
                                    <span>75% threshold</span>
                                    <span>{thresholdClasses} classes</span>
                                </div>
                            </div>

                            <div className="mini-grid">
                                <MiniStat
                                    label="Absence margin"
                                    value={`${absenceMargin >= 0 ? "+" : ""}${absenceMargin} classes`}
                                    tone={absenceMargin >= 0 ? "good" : "warning"}
                                />
                                <MiniStat label="Next threshold" value={nextThreshold} />
                            </div>
                        </article>
                        <article className="card kpi-card">
                            <div className="row">
                                <h2 className="card-label">Total Sessions Attended</h2>
                                <Badge tone={safeStatus === "Safe" ? "good" : "warning"}>{safeStatus}</Badge>
                            </div>
                            <strong className="kpi-value">{totalAttended}</strong>
                            <p>
                                You have attended {totalAttended} sessions out of {totalClasses} total classes so far.
                            </p>
                            <div className="attendance-detail">
                                <div className="row small">
                                    <span>Classes attended</span>
                                    <strong>{totalAttended} / {totalClasses}</strong>
                                </div>
                                <Progress value={overallAttendance} label="Total sessions attended" />
                            </div>
                        </article>

                        <article className="card kpi-card">
                            <div className="row">
                                <h2 className="card-label">Subjects Breakdown</h2>
                                <Badge>{totalSubjectCount} Subjects</Badge>
                            </div>
                            <strong className="kpi-value">{totalSubjectCount}</strong>
                            <p>
                                {breakdownCounts.Good} subjects are above 75%, {breakdownCounts.Warning} needs attention, and {breakdownCounts.Critical} is critical.
                            </p>
                            <div className="mini-grid mini-grid--three">
                                <MiniStat label="Good" value={breakdownCounts.Good} tone="good" />
                                <MiniStat label="Warning" value={breakdownCounts.Warning} tone="warning" />
                                <MiniStat label="Critical" value={breakdownCounts.Critical} tone="critical" />
                            </div>
                            <div className="attention-list small">
                                <div className="row">
                                    <span>Critical</span>
                                    <strong className="text-critical">{breakdownCounts.Critical} subject{breakdownCounts.Critical === 1 ? "" : "s"}</strong>
                                </div>
                                <div className="row">
                                    <span>Warning</span>
                                    <strong className="text-warning">{breakdownCounts.Warning} subject{breakdownCounts.Warning === 1 ? "" : "s"}</strong>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section aria-labelledby="subjects-title">
                        <div className="section-heading">
                            <div>
                                <h2 id="subjects-title">Core Subjects</h2>
                                <p>
                                    Review attendance health and required follow-up.
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
                                        setSelectedSemester(Number(event.target.value));
                                    }}
                                    hidden={!allSemesters.length}
                                >
                                    {allSemesters.map((value) => (
                                        <option key={value} value={value}>
                                            Semester {value}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="subject-grid">
                            {visibleSubjects.map((subject) => (
                                <SubjectCard
                                    key={`${subject.semester}-${subject.code}`}
                                    subject={subject}
                                />
                            ))}
                        </div>

                        {!visibleSubjects.length && (
                            <div className="card empty-state" role="status">
                                {semesterSubjects.length
                                    ? "No subjects match this filter."
                                    : "No subject attendance data available."}
                            </div>
                        )}
                    </section>

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
