export const calculateOverallAttendance = (student) => {
    let totalAttended = 0;
    let totalConducted = 0;

    // ==========================================
    // NORMAL SUBJECTS
    // ==========================================
    if (Array.isArray(student?.subjects)) {
        student.subjects.forEach((subject) => {
            const attended =
                Number(
                    subject?.sessionsAttended ??
                    subject?.sessions_attended ??
                    0
                ) || 0;

            const conducted =
                Number(
                    subject?.sessionsConducted ??
                    subject?.sessions_conducted ??
                    0
                ) || 0;

            totalAttended += attended;
            totalConducted += conducted;
        });
    }

    // ==========================================
    // GROWTH HOUR
    // ==========================================
    if (student?.growthHour) {
        const attended =
            Number(
                student.growthHour?.sessionsAttended ??
                student.growthHour?.sessions_attended ??
                0
            ) || 0;

        const conducted =
            Number(
                student.growthHour?.sessionsConducted ??
                student.growthHour?.sessions_conducted ??
                0
            ) || 0;

        totalAttended += attended;
        totalConducted += conducted;
    }

    // ==========================================
    // NO ATTENDANCE DATA
    // ==========================================
    if (totalConducted <= 0) {
        return 0;
    }

    // ==========================================
    // OVERALL ATTENDANCE
    // ==========================================
    return Number(
        ((totalAttended / totalConducted) * 100).toFixed(2)
    );
};