import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { calculateOverallAttendance } from "../utils/attendanceUtils";
import "./StudentAttendanceCard.css";

function StudentAttendanceCard({ student }) {
    const [isExpanded, setIsExpanded] =
        useState(false);

    const overallAttendance =
        calculateOverallAttendance(student);

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
                onClick={() =>
                    setIsExpanded(!isExpanded)
                }
            >
                <span>
                    {isExpanded
                        ? "Hide Attendance Details"
                        : "View Attendance Details"}
                </span>

                <ChevronDown
                    size={18}
                    className={
                        isExpanded
                            ? "chevron-expanded"
                            : ""
                    }
                />
            </button>

            {isExpanded && (
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
            )}

        </div>
    );
}

export default StudentAttendanceCard;