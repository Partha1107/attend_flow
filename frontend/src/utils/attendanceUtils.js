export const calculateOverallAttendance = (student) => {
    const percentages = [];

    // Normal subjects
    if (Array.isArray(student?.subjects)) {
        student.subjects.forEach((subject) => {
            const percentage = parseFloat(
                subject.attendancePercentage
            );

            if (Number.isFinite(percentage)) {
                percentages.push(percentage);
            }
        });
    }

    // Growth Hour
    if (student?.growthHour) {
        const growthHourPercentage = parseFloat(
            student.growthHour.attendancePercentage
        );

        if (Number.isFinite(growthHourPercentage)) {
            percentages.push(growthHourPercentage);
        }
    }

    // No attendance data
    if (percentages.length === 0) {
        return 0;
    }

    // Average of all subject + Growth Hour percentages
    const totalPercentage = percentages.reduce(
        (sum, percentage) => sum + percentage,
        0
    );

    return Number(
        (totalPercentage / percentages.length).toFixed(2)
    );
};