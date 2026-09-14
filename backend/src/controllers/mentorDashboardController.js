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
// Mentor:
//     Only assigned squad
//
// Campus Manager:
//     ALL students
//
// GET /api/mentor/dashboard/students
// ============================================================

const getStudents = async (req, res) => {
    try {
        // ----------------------------------------------------
        // GET LOGGED-IN USER PROFILE
        // ----------------------------------------------------

        const {
            data: mentorProfile,
            error: profileError,
        } = await supabase
            .from("mentor_profiles")
            .select(`
                college_name,
                squad,
                job_role
            `)
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!mentorProfile) {
            return res.status(403).json({
                success: false,
                profileExists: false,
                message:
                    "Please complete your mentor profile first.",
            });
        }

        const jobRole = cleanString(
            mentorProfile.job_role
        );

        const mentorSquad = cleanString(
            mentorProfile.squad
        );

        // ----------------------------------------------------
        // BUILD STUDENT QUERY
        // ----------------------------------------------------

        let studentQuery = supabase
            .from("students")
            .select("*")
            .order("name", {
                ascending: true,
            });

        // ----------------------------------------------------
        // MENTOR
        // Only their assigned squad
        // ----------------------------------------------------

        if (jobRole === "mentor") {
            if (!mentorSquad) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Mentor squad is not configured.",
                });
            }

            studentQuery = studentQuery.eq(
                "squad",
                mentorSquad
            );
        }

        // ----------------------------------------------------
        // CAMPUS MANAGER
        // Do NOT apply squad filter
        //
        // They can see every student
        // ----------------------------------------------------

        else if (jobRole === "campus_manager") {
            // No squad filter
        }

        // ----------------------------------------------------
        // UNKNOWN ROLE
        // ----------------------------------------------------

        else {
            return res.status(403).json({
                success: false,
                message:
                    "Invalid mentor job role.",
            });
        }

        // ----------------------------------------------------
        // GET STUDENTS
        // ----------------------------------------------------

        const {
            data: studentsData,
            error: studentsError,
        } = await studentQuery;

        if (studentsError) {
            throw studentsError;
        }

        const students =
            studentsData || [];

        // ----------------------------------------------------
        // GET OVERALL ATTENDANCE
        // ----------------------------------------------------

        const studentIds =
            students.map(
                (student) => student.id
            );

        let overallAttendanceData = [];

        if (studentIds.length > 0) {
            const {
                data,
                error,
            } = await supabase
                .from("overall_attendance")
                .select(`
                    student_id,
                    total_sessions_attended,
                    total_sessions_conducted,
                    attendance_percentage
                `)
                .in(
                    "student_id",
                    studentIds
                );

            if (error) {
                throw error;
            }

            overallAttendanceData =
                data || [];
        }

        // ----------------------------------------------------
        // CREATE ATTENDANCE LOOKUP
        // ----------------------------------------------------

        const overallAttendanceMap =
            new Map(
                overallAttendanceData.map(
                    (record) => [
                        record.student_id,
                        Number(
                            record.attendance_percentage
                        ) || 0,
                    ]
                )
            );

        // ----------------------------------------------------
        // BUILD RESULT
        // ----------------------------------------------------

        const result =
            students.map(
                (student) => {
                    const attendance =
                        overallAttendanceMap.get(
                            student.id
                        ) || 0;

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

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({
            success: true,

            // For campus manager, return "all"
            // For mentor, return assigned squad
            squad:
                jobRole === "campus_manager"
                    ? "all"
                    : mentorSquad,

            jobRole,

            mentor: {
                email: req.user.email,
                collegeName:
                    mentorProfile.college_name,
                squad:
                    jobRole === "campus_manager"
                        ? "all"
                        : mentorSquad,
                jobRole,
            },

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
// Mentor:
//     Only assigned squad
//
// Campus Manager:
//     ALL students
//
// GET /api/mentor/dashboard/attendance
// ============================================================

const getAttendanceRecords = async (
    req,
    res
) => {
    try {
        // ----------------------------------------------------
        // GET LOGGED-IN USER PROFILE
        // ----------------------------------------------------

        const {
            data: mentorProfile,
            error: profileError,
        } = await supabase
            .from("mentor_profiles")
            .select(`
                squad,
                job_role
            `)
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!mentorProfile) {
            return res.status(403).json({
                success: false,
                message:
                    "Mentor profile not found.",
            });
        }

        const jobRole = cleanString(
            mentorProfile.job_role
        );

        const mentorSquad = cleanString(
            mentorProfile.squad
        );

        // ----------------------------------------------------
        // BUILD STUDENT QUERY
        // ----------------------------------------------------

        let studentQuery = supabase
            .from("students")
            .select(
                "id, name, email, squad"
            );

        // ----------------------------------------------------
        // MENTOR → ASSIGNED SQUAD ONLY
        // ----------------------------------------------------

        if (jobRole === "mentor") {
            if (!mentorSquad) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Mentor squad is not configured.",
                });
            }

            studentQuery =
                studentQuery.eq(
                    "squad",
                    mentorSquad
                );
        }

        // ----------------------------------------------------
        // CAMPUS MANAGER → ALL STUDENTS
        // ----------------------------------------------------

        else if (
            jobRole === "campus_manager"
        ) {
            // No squad filter
        }

        // ----------------------------------------------------
        // INVALID ROLE
        // ----------------------------------------------------

        else {
            return res.status(403).json({
                success: false,
                message:
                    "Invalid mentor job role.",
            });
        }

        // ----------------------------------------------------
        // GET STUDENTS
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // NO STUDENTS
        // ----------------------------------------------------

        if (studentIds.length === 0) {
            return res.status(200).json({
                success: true,
                squad:
                    jobRole === "campus_manager"
                        ? "all"
                        : mentorSquad,

                jobRole,

                count: 0,
                records: [],
            });
        }

        // ----------------------------------------------------
        // GET ATTENDANCE
        // ----------------------------------------------------

        const {
            data: attendance,
            error: attendanceError,
        } = await supabase
            .from("attendance")
            .select(`
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
            `)
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

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({
            success: true,

            squad:
                jobRole === "campus_manager"
                    ? "all"
                    : mentorSquad,

            jobRole,

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
// Mentor:
//     Assigned squad only
//
// Campus Manager:
//     ALL students
//
// GET /api/mentor/dashboard/overview
// ============================================================

const getOverview = async (
    req,
    res
) => {
    try {
        // ----------------------------------------------------
        // GET LOGGED-IN USER PROFILE
        // ----------------------------------------------------

        const {
            data: mentorProfile,
            error: profileError,
        } = await supabase
            .from("mentor_profiles")
            .select(`
                squad,
                job_role
            `)
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!mentorProfile) {
            return res.status(403).json({
                success: false,
                message:
                    "Mentor profile not found.",
            });
        }

        const jobRole = cleanString(
            mentorProfile.job_role
        );

        const mentorSquad = cleanString(
            mentorProfile.squad
        );

        // ----------------------------------------------------
        // BUILD STUDENT QUERY
        // ----------------------------------------------------

        let studentQuery = supabase
            .from("students")
            .select(
                "id, name, email, squad"
            );

        // ----------------------------------------------------
        // MENTOR → ASSIGNED SQUAD
        // ----------------------------------------------------

        if (jobRole === "mentor") {
            if (!mentorSquad) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Mentor squad is not configured.",
                });
            }

            studentQuery =
                studentQuery.eq(
                    "squad",
                    mentorSquad
                );
        }

        // ----------------------------------------------------
        // CAMPUS MANAGER → ALL STUDENTS
        // ----------------------------------------------------

        else if (
            jobRole === "campus_manager"
        ) {
            // No squad filter
        }

        // ----------------------------------------------------
        // INVALID ROLE
        // ----------------------------------------------------

        else {
            return res.status(403).json({
                success: false,
                message:
                    "Invalid mentor job role.",
            });
        }

        // ----------------------------------------------------
        // GET STUDENTS
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // NO STUDENTS
        // ----------------------------------------------------

        if (studentIds.length === 0) {
            return res.status(200).json({
                success: true,

                squad:
                    jobRole === "campus_manager"
                        ? "all"
                        : mentorSquad,

                jobRole,

                overview: {
                    totalStudents: 0,
                    averageAttendance: 0,
                    studentsAbove75: 0,
                    studentsBelow75: 0,
                },
            });
        }

        // ----------------------------------------------------
        // GET OVERALL ATTENDANCE
        // ----------------------------------------------------

        const {
            data: overallAttendance,
            error: overallAttendanceError,
        } = await supabase
            .from("overall_attendance")
            .select(
                "student_id, attendance_percentage"
            )
            .in(
                "student_id",
                studentIds
            );

        if (overallAttendanceError) {
            throw overallAttendanceError;
        }

        // ----------------------------------------------------
        // CREATE LOOKUP MAP
        // ----------------------------------------------------

        const overallAttendanceMap =
            new Map(
                (overallAttendance || [])
                    .map(
                        (record) => [
                            record.student_id,
                            Number(
                                record.attendance_percentage
                            ) || 0,
                        ]
                    )
            );

        // ----------------------------------------------------
        // GET EACH STUDENT'S ATTENDANCE
        // ----------------------------------------------------

        const studentAttendance =
            studentList.map(
                (student) =>
                    overallAttendanceMap.get(
                        student.id
                    ) || 0
            );

        // ----------------------------------------------------
        // CALCULATE STATISTICS
        // ----------------------------------------------------

        const totalAttendance =
            studentAttendance.reduce(
                (
                    sum,
                    percentage
                ) =>
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

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({
            success: true,

            squad:
                jobRole === "campus_manager"
                    ? "all"
                    : mentorSquad,

            jobRole,

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
// UPDATE STUDENT CONTACT DETAILS
//
// Mentor:
//     Can update only students in assigned squad
//
// Campus Manager:
//     Can update any student
//
// PATCH /api/mentor/dashboard/students/:id/contact
// ============================================================

const updateStudentContact = async (
    req,
    res
) => {
    try {
        const studentId =
            cleanString(
                req.params.id
            );

        const phone =
            cleanString(
                req.body.phone
            );

        const parentEmail =
            cleanString(
                req.body.parent_email
            );

        const parentPhone =
            cleanString(
                req.body.parent_phone
            );

        // ----------------------------------------------------
        // VALIDATE STUDENT ID
        // ----------------------------------------------------

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message:
                    "Student ID is required.",
            });
        }

        // ----------------------------------------------------
        // GET LOGGED-IN USER PROFILE
        // ----------------------------------------------------

        const {
            data: mentorProfile,
            error: profileError,
        } = await supabase
            .from("mentor_profiles")
            .select(`
                squad,
                job_role
            `)
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!mentorProfile) {
            return res.status(403).json({
                success: false,
                message:
                    "Mentor profile not found.",
            });
        }

        const jobRole =
            cleanString(
                mentorProfile.job_role
            );

        const mentorSquad =
            cleanString(
                mentorProfile.squad
            );

        // ----------------------------------------------------
        // FIND STUDENT
        // ----------------------------------------------------

        let studentQuery = supabase
            .from("students")
            .select(`
                id,
                name,
                email,
                squad
            `)
            .eq("id", studentId);

        // ----------------------------------------------------
        // MENTOR → MUST BELONG TO THEIR SQUAD
        // ----------------------------------------------------

        if (jobRole === "mentor") {
            if (!mentorSquad) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Mentor squad is not configured.",
                });
            }

            studentQuery =
                studentQuery.eq(
                    "squad",
                    mentorSquad
                );
        }

        // ----------------------------------------------------
        // CAMPUS MANAGER → ANY STUDENT
        // ----------------------------------------------------

        else if (
            jobRole === "campus_manager"
        ) {
            // No squad restriction
        }

        // ----------------------------------------------------
        // INVALID ROLE
        // ----------------------------------------------------

        else {
            return res.status(403).json({
                success: false,
                message:
                    "Invalid mentor job role.",
            });
        }

        // ----------------------------------------------------
        // GET STUDENT
        // ----------------------------------------------------

        const {
            data: student,
            error: studentError,
        } = await studentQuery.maybeSingle();

        if (studentError) {
            throw studentError;
        }

        if (!student) {
            return res.status(404).json({
                success: false,
                message:
                    jobRole === "mentor"
                        ? "Student not found in your squad."
                        : "Student not found.",
            });
        }

        // ----------------------------------------------------
        // VALIDATE PARENT EMAIL
        // ----------------------------------------------------

        if (parentEmail) {
            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (
                !emailRegex.test(
                    parentEmail
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid parent email.",
                });
            }
        }

        // ----------------------------------------------------
        // VALIDATE PHONE NUMBERS
        // ----------------------------------------------------

        if (
            phone &&
            !/^\d{10}$/.test(phone)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `${student.name} — Student Phone must be exactly 10 digits.`,
            });
        }

        if (
            parentPhone &&
            !/^\d{10}$/.test(
                parentPhone
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `${student.name} — Parent Phone must be exactly 10 digits.`,
            });
        }

        // ----------------------------------------------------
        // UPDATE CONTACT INFORMATION
        // ----------------------------------------------------

        const {
            data: updatedStudent,
            error: updateError,
        } = await supabase
            .from("students")
            .update({
                phone:
                    phone || null,

                parent_email:
                    parentEmail || null,

                parent_phone:
                    parentPhone || null,

                updated_at:
                    new Date().toISOString(),
            })
            .eq(
                "id",
                studentId
            )
            .select(`
                id,
                name,
                email,
                squad,
                phone,
                parent_email,
                parent_phone,
                updated_at
            `)
            .single();

        if (updateError) {
            throw updateError;
        }

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({
            success: true,
            message:
                "Student contact details updated successfully.",
            student:
                updatedStudent,
        });

    } catch (error) {
        console.error(
            "Update student contact error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update student contact details.",
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
    updateStudentContact,
};