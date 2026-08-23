import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { calculateOverallAttendance } from "../utils/attendanceUtils";
import "./StudentAttendanceCard.css";

function StudentAttendanceCard({ student }) {
    const [isDetailsOpen, setIsDetailsOpen] =
        useState(false);

    const overallAttendance =
        calculateOverallAttendance(student);

    useEffect(() => {
        if (!isDetailsOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsDetailsOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isDetailsOpen]);

    return (
        <div className="student-attendance-card">

            <div className="student-card-header">

                <div className="student-info">
                    <h3>{student.name}</h3>

                    <span>
                        Squad {student.squad}
                    </span>
                </div>

                <div className="overall-attendance">
                    <span>
                        Overall Attendance
                    </span>

                    <strong>
                        {overallAttendance}%
                    </strong>
                </div>

            </div>

            <button
                type="button"
                className="attendance-details-button"
                onClick={() => setIsDetailsOpen(true)}
            >
                View Attendance Details
            </button>

            {isDetailsOpen && (
                <div
                    className="attendance-modal-overlay"
                    onClick={() => setIsDetailsOpen(false)}
                >
                    <div
                        className="attendance-details-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`attendance-title-${student.email}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="attendance-modal-header">
                            <div>
                                <h2 id={`attendance-title-${student.email}`}>
                                    Attendance Details
                                </h2>
                                <p>{student.name} · Squad {student.squad}</p>
                            </div>
                            <button
                                type="button"
                                className="attendance-modal-close"
                                aria-label="Close attendance details"
                                onClick={() => setIsDetailsOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="attendance-details">
                            <div className="attendance-table-wrapper">

                        <table className="attendance-table">

                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Classes Attended</th>
                                    <th>Classes Conducted</th>
                                    <th>Attendance</th>
                                </tr>
                            </thead>

                            <tbody>
                                {student.subjects.map(
                                    (subject, index) => {

                                        const attended =
                                            Number(
                                                subject.sessionsAttended
                                            ) || 0;

                                        const conducted =
                                            Number(
                                                subject.sessionsConducted
                                            ) || 0;

                                        const percentage =
                                            conducted > 0
                                                ? (
                                                    (attended /
                                                        conducted) *
                                                    100
                                                ).toFixed(2)
                                                : "0.00";

                                        return (
                                            <tr
                                                key={
                                                    subject.id ??
                                                    `${subject.name}-${index}`
                                                }
                                            >

                                                <td className="subject-name">
                                                    {subject.name}
                                                </td>

                                                <td>
                                                    {attended}
                                                </td>

                                                <td>
                                                    {conducted}
                                                </td>

                                                <td className="attendance-percentage">
                                                    {percentage}%
                                                </td>

                                            </tr>
                                        );
                                    }
                                )}

                                {student.growthHour && (
                                    <tr className="growth-hour-row">
                                        <td className="subject-name">
                                            Growth Hour
                                        </td>

                                        <td>
                                            {Number(
                                                student.growthHour.sessionsAttended
                                            ) || 0}
                                        </td>

                                        <td>
                                            {Number(
                                                student.growthHour.sessionsConducted
                                            ) || 0}
                                        </td>

                                        <td className="attendance-percentage">
                                            {parseFloat(
                                                student.growthHour.attendancePercentage
                                            ).toFixed(2)}
                                            %
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                        </table>

                            </div>
                        </div>

                        <button
                            type="button"
                            className="attendance-modal-done"
                            onClick={() => setIsDetailsOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

export default StudentAttendanceCard;