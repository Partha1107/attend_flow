
import { useMemo, useState } from "react";
import {
    BookOpen,
    CalendarCheck,
    ChartNoAxesCombined,
    ChevronRight,
    CircleAlert,
    GraduationCap,
    LogOut,
    MessageSquareWarning,
    UserRound,
} from "lucide-react";
import "./Student-page.css";

const getAttendanceStatus = (percentage) => {
    if (percentage >= 75) return "good";
    if (percentage >= 65) return "warning";
    return "critical";
};

const formatPercentage = (value) =>
    Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";

export default function Studentpage({
    student = null,
    subjects = [],
    loading = false,
    error = "",
    onLogout,
    onRetry,
}) {
    const [showIssueInfo, setShowIssueInfo] = useState(false);

    const attendanceSummary = useMemo(() => {
        const validSubjects = subjects.filter(
            (subject) =>
                Number.isFinite(Number(subject.attended)) &&
                Number.isFinite(Number(subject.total)) &&
                Number(subject.total) > 0 &&
                Number(subject.attended) >= 0 &&
                Number(subject.attended) <= Number(subject.total)
        );

        const attended = validSubjects.reduce(
            (sum, subject) => sum + Number(subject.attended),
            0
        );

        const total = validSubjects.reduce(
            (sum, subject) => sum + Number(subject.total),
            0
        );

        return {
            attended,
            total,
            percentage: total > 0 ? (attended / total) * 100 : null,
            validCount: validSubjects.length,
            lowCount: validSubjects.filter(
                (subject) =>
                    (Number(subject.attended) / Number(subject.total)) * 100 < 75
            ).length,
        };
    }, [subjects]);

    const hasAttendance = attendanceSummary.total > 0;

    return (
        <main className="student-page">
            <header className="student-topbar">
                <div className="student-brand">
                    <div className="student-brand-icon">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <h1>Attend Flow</h1>
                        <p>Student Portal</p>
                    </div>
                </div>

                <div className="student-profile">
                    <div className="student-avatar">
                        <UserRound size={20} />
                    </div>

                    <div className="student-profile-info">
                        <strong>{student?.name || "Student"}</strong>
                        <span>{student?.email || "Student account"}</span>
                    </div>

                    {onLogout && (
                        <button
                            type="button"
                            className="student-logout"
                            onClick={onLogout}
                            aria-label="Log out"
                            title="Log out"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </header>

            <section className="student-content">
                <div className="student-welcome">
                    <div>
                        <span className="student-eyebrow">STUDENT DASHBOARD</span>
                        <h2>
                            Welcome{student?.name ? `, ${student.name}` : ""}!
                        </h2>
                        <p>Here's an overview of your attendance.</p>
                    </div>

                    {student?.squad && (
                        <span className="student-squad">
                            Squad {student.squad}
                        </span>
                    )}
                </div>

                {error && (
                    <div className="student-error" role="alert">
                        <CircleAlert size={20} />
                        <span>{error}</span>
                        {onRetry && (
                            <button type="button" onClick={onRetry}>
                                Retry
                            </button>
                        )}
                    </div>
                )}

                <section className="student-summary-grid">
                    <article className="student-summary-card">
                        <div className="student-card-heading">
                            <span className="student-card-icon red">
                                <ChartNoAxesCombined size={21} />
                            </span>
                            <span>Overall Attendance</span>
                        </div>

                        <div className="student-card-value">
                            {loading
                                ? "Loading..."
                                : hasAttendance
                                    ? formatPercentage(attendanceSummary.percentage)
                                    : "—"}
                        </div>

                        <div
                            className="student-progress-track"
                            role="progressbar"
                            aria-label="Overall attendance"
                            aria-valuenow={
                                hasAttendance ? attendanceSummary.percentage : undefined
                            }
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div
                                className="student-progress-fill red-fill"
                                style={{
                                    width: `${hasAttendance ? attendanceSummary.percentage : 0
                                        }%`,
                                }}
                            />
                        </div>

                        <p className="student-card-note">
                            {loading
                                ? "Fetching attendance..."
                                : hasAttendance
                                    ? `${attendanceSummary.attended} of ${attendanceSummary.total} classes attended`
                                    : "Attendance data is not available yet."}
                        </p>
                    </article>

                    <article className="student-summary-card">
                        <div className="student-card-heading">
                            <span className="student-card-icon blue">
                                <BookOpen size={21} />
                            </span>
                            <span>Subjects</span>
                        </div>

                        <div className="student-card-value">
                            {loading ? "—" : attendanceSummary.validCount}
                        </div>

                        <p className="student-card-note">
                            Subjects with available attendance records
                        </p>
                    </article>

                    <article className="student-summary-card">
                        <div className="student-card-heading">
                            <span className="student-card-icon amber">
                                <CalendarCheck size={21} />
                            </span>
                            <span>Need Attention</span>
                        </div>

                        <div className="student-card-value">
                            {loading ? "—" : attendanceSummary.lowCount}
                        </div>

                        <p className="student-card-note">
                            Subjects below 75% attendance
                        </p>
                    </article>
                </section>

                <section className="student-section">
                    <div className="student-section-heading">
                        <div>
                            <h3>Subject-wise Attendance</h3>
                            <p>Review your attendance for each subject.</p>
                        </div>
                        <BookOpen size={22} />
                    </div>

                    {loading ? (
                        <div className="student-empty-state">
                            Loading your attendance records...
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="student-empty-state">
                            <BookOpen size={30} />
                            <strong>No attendance records available</strong>
                            <p>Your subject-wise attendance will appear here.</p>
                        </div>
                    ) : (
                        <div className="student-subject-list">
                            {subjects.map((subject) => {
                                const attended = Number(subject.attended);
                                const total = Number(subject.total);
                                const valid =
                                    Number.isFinite(attended) &&
                                    Number.isFinite(total) &&
                                    total > 0 &&
                                    attended >= 0 &&
                                    attended <= total;

                                const percentage = valid
                                    ? (attended / total) * 100
                                    : null;

                                const status = valid
                                    ? getAttendanceStatus(percentage)
                                    : "unavailable";

                                return (
                                    <article
                                        className="student-subject-card"
                                        key={subject.id ?? subject.name}
                                    >
                                        <div className="student-subject-top">
                                            <div className="student-subject-icon">
                                                <BookOpen size={19} />
                                            </div>

                                            <div className="student-subject-name">
                                                <strong>{subject.name}</strong>
                                                <span>
                                                    {valid
                                                        ? `${attended} attended / ${total} classes`
                                                        : "Attendance details unavailable"}
                                                </span>
                                            </div>

                                            <div className="student-subject-result">
                                                <strong>
                                                    {percentage === null
                                                        ? "—"
                                                        : formatPercentage(percentage)}
                                                </strong>
                                                <span className={`student-status ${status}`}>
                                                    {status === "unavailable"
                                                        ? "Unavailable"
                                                        : status === "good"
                                                            ? "Good"
                                                            : status === "warning"
                                                                ? "Warning"
                                                                : "Critical"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="student-progress-track">
                                            <div
                                                className={`student-progress-fill ${status}`}
                                                style={{
                                                    width: `${percentage ?? 0}%`,
                                                }}
                                            />
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="student-issue-card">
                    <div className="student-issue-icon">
                        <MessageSquareWarning size={25} />
                    </div>

                    <div className="student-issue-content">
                        <h3>Attendance Issues?</h3>
                        <p>
                            Found missing or incorrect attendance? Report the issue
                            to your respective class mentor.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="student-issue-button"
                        onClick={() => setShowIssueInfo(true)}
                    >
                        Report an Issue
                        <ChevronRight size={18} />
                    </button>
                </section>

                {showIssueInfo && (
                    <div
                        className="student-modal-backdrop"
                        onClick={() => setShowIssueInfo(false)}
                    >
                        <section
                            className="student-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="student-issue-modal-title"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="student-modal-close"
                                onClick={() => setShowIssueInfo(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>

                            <MessageSquareWarning size={30} />
                            <h3 id="student-issue-modal-title">
                                Attendance Issue Reporting
                            </h3>
                            <p>
                                The reporting form and mentor notification system
                                will be added in a later phase.
                            </p>

                            <button
                                type="button"
                                className="student-issue-button"
                                onClick={() => setShowIssueInfo(false)}
                            >
                                Got it
                            </button>
                        </section>
                    </div>
                )}
            </section>
        </main>
    );
}
