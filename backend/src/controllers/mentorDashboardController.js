const supabase = require("../config/supabase");

// ============================================================
// HELPERS
// ============================================================

const toNumber = (value, defaultValue = 0) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return defaultValue;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : defaultValue;
};

const cleanString = (value) => {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
};

// ============================================================
// CALCULATE ATTENDANCE BY STUDENT
// ============================================================

const calculateAttendanceByStudent = (records) => {
    const totals = new Map();

    for (const record of records || []) {
        if (!record.student_id) {
            continue;
        }

        const current =
            totals.get(record.student_id) || {
                conducted: 0,
                attended: 0,
            };

        current.conducted += toNumber(
            record.sessions_conducted
        );

        current.attended += toNumber(
            record.sessions_attended
        );

        totals.set(
            record.student_id,
            current
        );
    }

    return totals;
};

// ============================================================
// ATTENDANCE PERCENTAGE
// ============================================================

const getAttendancePercentage = (total) => {
    if (
        !total ||
        total.conducted <= 0
    ) {
        return 0;
    }

    return Number(
        (
            (total.attended /
                total.conducted) *
            100
        ).toFixed(2)
    );
};

// ============================================================
// GET SQUADS
// ============================================================

const getSquads = async (req, res) => {
    try {
        const {
            data,
            error,
        } = await supabase
            .from("students")
            .select("squad")
            .not("squad", "is", null)
            .order("squad", {
                ascending: true,
            });

        if (error) {
            throw error;
        }

        const squads = [
            ...new Set(
                (data || [])
                    .map((student) =>
                        cleanString(student.squad)
                    )
                    .filter(Boolean)
            ),
        ].sort((a, b) =>
            a.localeCompare(
                b,
                undefined,
                {
                    numeric: true,
                }
            )
        );

        return res.status(200).json({
            success: true,
            squads,
        });
    } catch (error) {
        console.error(
            "Get squads error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch squads",
            error: error.message,
        });
    }
};

// ============================================================
// GET STUDENTS
//
// GET /api/mentor/dashboard/students
// GET /api/mentor/dashboard/students?squad=138
// ============================================================

const getStudents = async (req, res) => {
    try {
        const squad = cleanString(
            req.query.squad
        );

        // --------------------------------------------------------
        // GET STUDENTS
        // --------------------------------------------------------

        let studentQuery = supabase
            .from("students")
            .select("*")
            .order("name", {
                ascending: true,
            });

        // IMPORTANT:
        // Filter directly in Supabase.
        if (squad) {
            studentQuery =
                studentQuery.eq(
                    "squad",
                    squad
                );
        }

        const {
            data: studentsData,
            error: studentsError,
        } = await studentQuery;

        if (studentsError) {
            throw studentsError;
        }

        const students =
            studentsData || [];

        // --------------------------------------------------------
        // GET ONLY ATTENDANCE FOR THESE STUDENTS
        // --------------------------------------------------------

        const studentIds =
            students.map(
                (student) =>
                    student.id
            );

        let attendanceData = [];

        if (studentIds.length > 0) {
            const {
                data,
                error,
            } = await supabase
                .from("attendance")
                .select(
                    "student_id, sessions_conducted, sessions_attended"
                )
                .in(
                    "student_id",
                    studentIds
                );

            if (error) {
                throw error;
            }

            attendanceData =
                data || [];
        }

        // --------------------------------------------------------
        // CALCULATE ATTENDANCE
        // --------------------------------------------------------

        const totals =
            calculateAttendanceByStudent(
                attendanceData
            );

        const result = students.map(
            (student) => {
                const attendance =
                    getAttendancePercentage(
                        totals.get(
                            student.id
                        )
                    );

                return {
                    ...student,

                    attendance,

                    status:
                        attendance >= 75
                            ? "Present"
                            : "Absent",
                };
            }
        );

        return res.status(200).json({
            success: true,

            squad:
                squad || null,

            count: result.length,

            students: result,
        });
    } catch (error) {
        console.error(
            "Get dashboard students error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to fetch dashboard students",

            error: error.message,
        });
    }
};

// ============================================================
// GET ATTENDANCE RECORDS
//
// GET /api/mentor/dashboard/attendance
// GET /api/mentor/dashboard/attendance?squad=138
// ============================================================

const getAttendanceRecords = async (
    req,
    res
) => {
    try {
        const squad = cleanString(
            req.query.squad
        );

        // --------------------------------------------------------
        // FIRST GET STUDENTS OF SELECTED SQUAD
        // --------------------------------------------------------

        let studentQuery = supabase
            .from("students")
            .select(
                "id, name, email, squad"
            );

        if (squad) {
            studentQuery =
                studentQuery.eq(
                    "squad",
                    squad
                );
        }

        const {
            data: students,
            error: studentsError,
        } = await studentQuery;

        if (studentsError) {
            throw studentsError;
        }

        const studentIds =
            (students || []).map(
                (student) =>
                    student.id
            );

        if (studentIds.length === 0) {
            return res.status(200).json({
                success: true,
                squad:
                    squad || null,
                count: 0,
                records: [],
            });
        }

        // --------------------------------------------------------
        // GET ATTENDANCE ONLY FOR THOSE STUDENTS
        // --------------------------------------------------------

        const {
            data: attendance,
            error: attendanceError,
        } = await supabase
            .from("attendance")
            .select(
                `
                *,
                students(
                    id,
                    name,
                    email,
                    squad
                ),
                subjects(
                    name
                )
                `
            )
            .in(
                "student_id",
                studentIds
            )
            .order(
                "updated_at",
                {
                    ascending: false,
                }
            );

        if (attendanceError) {
            throw attendanceError;
        }

        return res.status(200).json({
            success: true,

            squad:
                squad || null,

            count:
                (attendance || [])
                    .length,

            records:
                attendance || [],
        });
    } catch (error) {
        console.error(
            "Get dashboard attendance error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to fetch attendance records",

            error: error.message,
        });
    }
};

// ============================================================
// GET DASHBOARD OVERVIEW
//
// GET /api/mentor/dashboard/overview
// GET /api/mentor/dashboard/overview?squad=138
// ============================================================

const getOverview = async (
    req,
    res
) => {
    try {
        const squad = cleanString(
            req.query.squad
        );

        // --------------------------------------------------------
        // GET STUDENTS
        // --------------------------------------------------------

        let studentQuery = supabase
            .from("students")
            .select(
                "id, name, email, squad"
            );

        if (squad) {
            studentQuery =
                studentQuery.eq(
                    "squad",
                    squad
                );
        }

        const {
            data: students,
            error: studentsError,
        } = await studentQuery;

        if (studentsError) {
            throw studentsError;
        }

        const studentList =
            students || [];

        const studentIds =
            studentList.map(
                (student) =>
                    student.id
            );

        // --------------------------------------------------------
        // NO STUDENTS
        // --------------------------------------------------------

        if (studentIds.length === 0) {
            return res.status(200).json({
                success: true,

                squad:
                    squad || null,

                overview: {
                    totalStudents: 0,
                    averageAttendance: 0,
                    studentsAbove75: 0,
                    studentsBelow75: 0,
                },
            });
        }

        // --------------------------------------------------------
        // GET ATTENDANCE FOR SQUAD
        // --------------------------------------------------------

        const {
            data: attendance,
            error: attendanceError,
        } = await supabase
            .from("attendance")
            .select(
                "student_id, sessions_conducted, sessions_attended"
            )
            .in(
                "student_id",
                studentIds
            );

        if (attendanceError) {
            throw attendanceError;
        }

        // --------------------------------------------------------
        // CALCULATE
        // --------------------------------------------------------

        const totals =
            calculateAttendanceByStudent(
                attendance
            );

        const studentAttendance =
            studentList.map(
                (student) => {
                    return getAttendancePercentage(
                        totals.get(
                            student.id
                        )
                    );
                }
            );

        const totalAttendance =
            studentAttendance.reduce(
                (sum, percentage) =>
                    sum + percentage,
                0
            );

        const averageAttendance =
            studentAttendance.length > 0
                ? Number(
                    (
                        totalAttendance /
                        studentAttendance.length
                    ).toFixed(2)
                )
                : 0;

        const studentsAbove75 =
            studentAttendance.filter(
                (attendance) =>
                    attendance >= 75
            ).length;

        const studentsBelow75 =
            studentAttendance.filter(
                (attendance) =>
                    attendance < 75
            ).length;

        // --------------------------------------------------------
        // RESPONSE
        // --------------------------------------------------------

        return res.status(200).json({
            success: true,

            squad:
                squad || null,

            overview: {
                totalStudents:
                    studentList.length,

                averageAttendance,

                studentsAbove75,

                studentsBelow75,
            },
        });
    } catch (error) {
        console.error(
            "Get dashboard overview error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to fetch dashboard overview",

            error: error.message,
        });
    }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getSquads,
    getStudents,
    getAttendanceRecords,
    getOverview,
};