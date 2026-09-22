export const calculateOverallAttendance = (student) => {
    // NOTE:
    // This is the EXISTING overall attendance calculation
    // (subjects + growth hour). It is intentionally left
    // untouched.
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

// ==========================================
// GROWTH HOUR RECORD GUARD
//
// The database stores growth hour as an
// attendance row with:
//
//     attendance_type = "growth_hour"
//     subject_id      = null
//
// Subject rows use:
//
//     attendance_type = "subject"
//
// A growth hour row must NEVER take part in the
// "without growth hour" calculation.
// ==========================================

const isGrowthHourAttendanceRecord = (record) => {
    const type = String(
        record?.attendance_type ?? ""
    )
        .trim()
        .toLowerCase();

    if (type === "growth_hour") {
        return true;
    }

    // ------------------------------------------
    // Fallback: rows without attendance_type
    // (older imports) are detected by name.
    // ------------------------------------------

    if (type === "subject") {
        return false;
    }

    const name = String(
        record?.subjects?.name ??
        record?.subject_name ??
        ""
    )
        .trim()
        .toLowerCase();

    return (
        name.includes("growth hour") ||
        name.includes("growth_hour")
    );
};

// ==========================================
// PERIOD / SEMESTER SCOPE
//
// The existing ON value comes from the
// "overall_attendance" table, which is upserted
// onConflict: "student_id" — meaning it holds
// the LATEST imported period for that student.
//
// The "attendance" table however keeps one row
// per student / subject / semester / period, so
// the same subject can appear once for every
// period that was imported.
//
// The OFF value is scoped to the same latest
// period (and semester) so both percentages
// describe the very same sessions and nothing
// is counted twice.
// ==========================================

const getLatestScope = (records) => {
    let latest = null;

    records.forEach((record) => {
        const start = String(record?.period_start ?? "");

        if (!start) {
            return;
        }

        if (!latest || start > latest.period_start) {
            latest = {
                period_start: start,

                period_end: String(
                    record?.period_end ?? ""
                ),

                semester: String(record?.semester ?? ""),
            };
        }
    });

    return latest;
};

const isInScope = (record, scope) => {
    // ------------------------------------------
    // No period information (older rows):
    // fall back to counting every subject row.
    // ------------------------------------------

    if (!scope) {
        return true;
    }

    if (
        String(record?.period_start ?? "") !==
        scope.period_start
    ) {
        return false;
    }

    if (
        scope.period_end &&
        String(record?.period_end ?? "") !==
        scope.period_end
    ) {
        return false;
    }

    if (
        scope.semester &&
        String(record?.semester ?? "") !==
        scope.semester
    ) {
        return false;
    }

    return true;
};

// ==========================================
// ATTENDANCE WITHOUT GROWTH HOUR
//
// Present Sessions   = sum of sessions attended
//                      across ALL subjects
// Conducted Sessions = sum of sessions conducted
//                      across ALL subjects
//
//     (total present / total conducted) * 100
//
// Growth hour, subject credits, weighted
// averages and per-subject percentage averages
// are intentionally NOT used.
//
// Records come from the existing "attendance"
// table via GET /api/mentor/dashboard/attendance.
// ==========================================

export const calculateAttendanceWithoutGrowthHour = (records) => {
    const allRecords = Array.isArray(records)
        ? records.filter((record) => record && typeof record === "object")
        : [];

    // ==========================================
    // SCOPE TO THE LATEST IMPORTED PERIOD
    // ==========================================

    const latestScope = getLatestScope(allRecords);

    let presentSessions = 0;
    let conductedSessions = 0;

    allRecords.forEach((record) => {
        // ------------------------------------------
        // SUBJECT ROWS ONLY (GROWTH HOUR EXCLUDED)
        // ------------------------------------------

        if (isGrowthHourAttendanceRecord(record)) {
            return;
        }

        if (!isInScope(record, latestScope)) {
            return;
        }

        const attended =
            Number(record?.sessions_attended) || 0;

        const conducted =
            Number(record?.sessions_conducted) || 0;

        presentSessions += attended;
        conductedSessions += conducted;
    });

    // ==========================================
    // NO CONDUCTED SESSIONS
    // ==========================================

    if (conductedSessions <= 0) {
        return {
            presentSessions,
            conductedSessions: 0,
            percentage: 0,
        };
    }

    // ==========================================
    // ATTENDANCE PERCENTAGE
    //
    // Raw value is kept unrounded. Formatting
    // with toFixed(2) happens at display time.
    // ==========================================

    return {
        presentSessions,
        conductedSessions,

        percentage:
            (presentSessions /
                conductedSessions) *
            100,
    };
};

// ==========================================
// SUBJECT-WISE ATTENDANCE
//
// Builds one entry per subject from the same
// existing attendance rows used above.
//
//     subject percentage =
//         (present sessions / conducted sessions) * 100
//
// Rules:
//   - growth hour rows are excluded
//   - the same latest period / semester scope is
//     used as the "without growth hour" value, so
//     the subject rows add up to that total
//   - subjects are read dynamically from the
//     records (subjects.name) - nothing hardcoded
//   - subject percentages are NEVER averaged
// ==========================================

export const calculateSubjectWiseAttendance = (records) => {
    const allRecords = Array.isArray(records)
        ? records.filter(
            (record) =>
                record &&
                typeof record === "object"
        )
        : [];

    // ==========================================
    // SCOPE TO THE LATEST IMPORTED PERIOD
    // ==========================================

    const latestScope = getLatestScope(allRecords);

    const subjectsMap = new Map();

    allRecords.forEach((record) => {
        // ------------------------------------------
        // SUBJECT ROWS ONLY (GROWTH HOUR EXCLUDED)
        // ------------------------------------------

        if (isGrowthHourAttendanceRecord(record)) {
            return;
        }

        if (!isInScope(record, latestScope)) {
            return;
        }

        const subjectId =
            record?.subject_id ?? null;

        const subjectName = String(
            record?.subjects?.name ??
            record?.subject_name ??
            ""
        ).trim();

        // ------------------------------------------
        // A SUBJECT ROW MUST BE IDENTIFIABLE
        // ------------------------------------------

        if (!subjectId && !subjectName) {
            return;
        }

        const key = subjectId
            ? `id:${subjectId}`
            : `name:${subjectName.toLowerCase()}`;

        const existing =
            subjectsMap.get(key) || {
                subjectId,
                subjectName:
                    subjectName || "Unnamed subject",
                presentSessions: 0,
                conductedSessions: 0,
            };

        existing.presentSessions +=
            Number(record?.sessions_attended) || 0;

        existing.conductedSessions +=
            Number(record?.sessions_conducted) || 0;

        if (!existing.subjectName && subjectName) {
            existing.subjectName = subjectName;
        }

        subjectsMap.set(key, existing);
    });

    // ==========================================
    // SUBJECT PERCENTAGES
    //
    // Raw values (unrounded). toFixed(2) is applied
    // at display time only.
    // ==========================================

    return [...subjectsMap.values()]
        .map((subject) => ({
            ...subject,

            percentage:
                subject.conductedSessions > 0
                    ? (subject.presentSessions /
                        subject.conductedSessions) *
                    100
                    : 0,
        }))
        .sort((first, second) =>
            first.subjectName.localeCompare(
                second.subjectName
            )
        );
};