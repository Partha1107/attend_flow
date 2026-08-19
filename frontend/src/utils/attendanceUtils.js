export const calculateOverallAttendance = (student) => {
    if (!student?.subjects?.length) {
        return 0;
    }

    let totalConducted = 0;
    let totalAttended = 0;

    student.subjects.forEach((subject) => {
        const conducted =
            Number(subject.sessionsConducted) || 0;

        const attended =
            Number(subject.sessionsAttended) || 0;

        totalConducted += conducted;
        totalAttended += attended;
    });

    if (totalConducted === 0) {
        return 0;
    }

    return Number(
        ((totalAttended / totalConducted) * 100).toFixed(2)
    );
};