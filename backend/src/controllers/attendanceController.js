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

const calculateAttendanceByStudent = (records) => {
    const totals = new Map();

    for (const record of records || []) {
        if (!record.student_id) continue;

        const current = totals.get(record.student_id) || {
            conducted: 0,
            attended: 0,
        };

        current.conducted += toNumber(record.sessions_conducted);
        current.attended += toNumber(record.sessions_attended);
        totals.set(record.student_id, current);
    }

    return totals;
};

const getAttendancePercentage = (total) => {
    if (!total || total.conducted <= 0) return 0;
    return Number(((total.attended / total.conducted) * 100).toFixed(2));
};

const getAttendanceTotals = async () => {
    const { data, error } = await supabase
        .from("attendance")
        .select("student_id, sessions_conducted, sessions_attended");

    if (error) throw error;
    return calculateAttendanceByStudent(data);
};

// ============================================================
// TEST SUPABASE
// ============================================================

const testSupabase = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("students")
            .select("id")
            .limit(1);

        if (error) {
            return res.status(500).json({
                success: false,
                error: error.message,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Supabase connection working",
            data,
        });
    } catch (error) {
        console.error(
            "testSupabase error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// ============================================================
// TEST ATTENDANCE INSERT
// ============================================================

const testAttendanceInsert = async (
    req,
    res
) => {
    try {
        // --------------------------------------------------------
        // Find one student
        // --------------------------------------------------------

        const { data: student, error: studentError } =
            await supabase
                .from("students")
                .select("id")
                .limit(1)
                .maybeSingle();

        if (studentError) {
            return res.status(500).json({
                success: false,
                error: studentError.message,
            });
        }

        if (!student) {
            return res.status(404).json({
                success: false,
                error: "No student found.",
            });
        }

        // --------------------------------------------------------
        // Insert test attendance
        // --------------------------------------------------------

        const testAttendance = {
            student_id: student.id,
            subject_id: "TEST-SUBJECT",
            attendance_type: "subject",
            academic_year: "2026-2027",
            semester: "Sem 1",
            period_start: "2026-08-01",
            period_end: "2026-08-10",
            sessions_conducted: 10,
            sessions_attended: 8,
            sessions_absent: 2,
            attendance_percentage: 80,
            sessions_marked_od: 0,
            sessions_medical_leave: 0,
            sessions_applied_leave: 0,
        };

        const {
            data,
            error,
        } = await supabase
            .from("attendance")
            .insert(testAttendance)
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                error: error.message,
            });
        }

        return res.status(201).json({
            success: true,
            message:
                "Test attendance inserted successfully.",
            data,
        });
    } catch (error) {
        console.error(
            "testAttendanceInsert error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// ============================================================
// FIND STUDENT BY EMAIL
// ============================================================

const findStudentByEmail = async (
    email
) => {
    const {
        data,
        error,
    } = await supabase
        .from("students")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Failed to find student ${email}: ${error.message}`
        );
    }

    return data;
};

// ============================================================
// CREATE / UPDATE STUDENT
// ============================================================

const createOrUpdateStudent = async (
    student
) => {
    const email = cleanString(
        student.email
    );

    const name = cleanString(
        student.name
    );

    const squad = cleanString(
        student.squad
    );

    if (!email) {
        throw new Error(
            "Student email is missing."
        );
    }

    // ----------------------------------------------------------
    // Check existing student
    // ----------------------------------------------------------

    const existingStudent =
        await findStudentByEmail(email);

    // ----------------------------------------------------------
    // UPDATE
    // ----------------------------------------------------------

    if (existingStudent) {
        const updateData = {
            name,
            squad,
        };

        const {
            data,
            error,
        } = await supabase
            .from("students")
            .update(updateData)
            .eq(
                "id",
                existingStudent.id
            )
            .select()
            .single();

        if (error) {
            throw new Error(
                `Failed to update student ${email}: ${error.message}`
            );
        }

        return {
            student: data,
            created: false,
            updated: true,
        };
    }

    // ----------------------------------------------------------
    // CREATE
    // ----------------------------------------------------------

    const {
        data,
        error,
    } = await supabase
        .from("students")
        .insert({
            email,
            name,
            squad,
        })
        .select()
        .single();

    if (error) {
        throw new Error(
            `Failed to create student ${email}: ${error.message}`
        );
    }

    return {
        student: data,
        created: true,
        updated: false,
    };
};

// ============================================================
// FIND SUBJECT
// ============================================================

const findSubject = async (
    subjectId
) => {
    if (!subjectId) {
        return null;
    }

    const {
        data,
        error,
    } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Failed to find subject ${subjectId}: ${error.message}`
        );
    }

    return data;
};

// ============================================================
// CREATE / UPDATE SUBJECT
// ============================================================

const createOrUpdateSubject = async ({
    id,
    name,
    semester,
}) => {
    const subjectId =
        cleanString(id);

    const subjectName =
        cleanString(name);

    if (!subjectId) {
        return {
            subject: null,
            created: false,
            updated: false,
        };
    }

    // ----------------------------------------------------------
    // Find existing subject
    // ----------------------------------------------------------

    const existingSubject =
        await findSubject(subjectId);

    // ----------------------------------------------------------
    // UPDATE
    // ----------------------------------------------------------

    if (existingSubject) {
        const updateData = {
            name: subjectName,
            semester,
        };

        const {
            data,
            error,
        } = await supabase
            .from("subjects")
            .update(updateData)
            .eq(
                "id",
                subjectId
            )
            .select()
            .single();

        if (error) {
            throw new Error(
                `Failed to update subject ${subjectId}: ${error.message}`
            );
        }

        return {
            subject: data,
            created: false,
            updated: true,
        };
    }

    // ----------------------------------------------------------
    // CREATE
    // ----------------------------------------------------------

    const {
        data,
        error,
    } = await supabase
        .from("subjects")
        .insert({
            id: subjectId,
            name: subjectName,
            semester,
        })
        .select()
        .single();

    if (error) {
        throw new Error(
            `Failed to create subject ${subjectId}: ${error.message}`
        );
    }

    return {
        subject: data,
        created: true,
        updated: false,
    };
};

// ============================================================
// FIND EXISTING ATTENDANCE
// ============================================================

const findExistingAttendance = async ({
    studentId,
    subjectId,
    attendanceType,
    academicYear,
    semester,
    periodStart,
    periodEnd,
}) => {
    let query = supabase
        .from("attendance")
        .select("id")
        .eq(
            "student_id",
            studentId
        )
        .eq(
            "academic_year",
            academicYear
        )
        .eq(
            "semester",
            semester
        )
        .eq(
            "period_start",
            periodStart
        )
        .eq(
            "period_end",
            periodEnd
        )
        .eq(
            "attendance_type",
            attendanceType
        );

    // ----------------------------------------------------------
    // NORMAL SUBJECT
    // ----------------------------------------------------------

    if (
        attendanceType === "subject"
    ) {
        query = query.eq(
            "subject_id",
            subjectId
        );
    }

    // ----------------------------------------------------------
    // GROWTH HOUR
    // ----------------------------------------------------------

    if (
        attendanceType === "growth_hour"
    ) {
        query = query.is(
            "subject_id",
            null
        );
    }

    const {
        data,
        error,
    } = await query.maybeSingle();

    if (error) {
        throw new Error(
            `Failed to find attendance: ${error.message}`
        );
    }

    return data;
};

// ============================================================
// CREATE / UPDATE ATTENDANCE
// ============================================================

const createOrUpdateAttendance = async ({
    studentId,
    subjectId,
    attendanceType,
    academicYear,
    semester,
    periodStart,
    periodEnd,
    attendance,
}) => {
    const sessionsConducted = toNumber(
        attendance.sessionsConducted
    );

    const sessionsAttended = toNumber(
        attendance.sessionsAttended
    );

    const sessionsAbsent = toNumber(
        attendance.sessionsAbsent
    );

    const attendancePercentage =
        sessionsConducted > 0
            ? Number(
                ((sessionsAttended / sessionsConducted) * 100).toFixed(2)
            )
            : 0;

    const attendanceData = {
        student_id: studentId,

        subject_id:
            attendanceType ===
                "growth_hour"
                ? null
                : subjectId,

        attendance_type:
            attendanceType,

        academic_year:
            academicYear,

        semester,

        period_start:
            periodStart,

        period_end:
            periodEnd,

        sessions_conducted: sessionsConducted,

        sessions_attended: sessionsAttended,

        sessions_absent: sessionsAbsent,

        attendance_percentage: attendancePercentage,

        sessions_marked_od:
            toNumber(
                attendance.sessionsMarkedOD
            ),

        sessions_medical_leave:
            toNumber(
                attendance.sessionsMedicalLeave
            ),

        sessions_applied_leave:
            toNumber(
                attendance.sessionsAppliedLeave
            ),

        updated_at:
            new Date().toISOString(),
    };

    // ----------------------------------------------------------
    // FIND EXISTING RECORD
    // ----------------------------------------------------------

    const existingAttendance =
        await findExistingAttendance({
            studentId,
            subjectId,
            attendanceType,
            academicYear,
            semester,
            periodStart,
            periodEnd,
        });

    // ----------------------------------------------------------
    // UPDATE EXISTING
    // ----------------------------------------------------------

    if (existingAttendance) {
        const {
            data,
            error,
        } = await supabase
            .from("attendance")
            .update(attendanceData)
            .eq(
                "id",
                existingAttendance.id
            )
            .select()
            .single();

        if (error) {
            throw new Error(
                `Failed to update attendance: ${error.message}`
            );
        }

        return {
            data,
            created: false,
            updated: true,
        };
    }

    // ----------------------------------------------------------
    // INSERT NEW
    // ----------------------------------------------------------

    const {
        data,
        error,
    } = await supabase
        .from("attendance")
        .insert({
            ...attendanceData,
            created_at:
                new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        throw new Error(
            `Failed to insert attendance: ${error.message}`
        );
    }

    return {
        data,
        created: true,
        updated: false,
    };
};

// ============================================================
// IMPORT ATTENDANCE
// ============================================================

const importAttendance = async (
    req,
    res
) => {
    try {
        console.log(
            "================================================"
        );

        console.log(
            "ATTENDANCE IMPORT STARTED"
        );

        console.log(
            "================================================"
        );

        // ========================================================
        // REQUEST DATA
        // ========================================================

        const {
            academicYear,
            semester,
            periodStart,
            periodEnd,
            students,
        } = req.body;

        console.log(
            "Academic Year:",
            academicYear
        );

        console.log(
            "Semester:",
            semester
        );

        console.log(
            "Period:",
            periodStart,
            "→",
            periodEnd
        );

        console.log(
            "Students:",
            students?.length
        );

        // ========================================================
        // VALIDATION
        // ========================================================

        if (!academicYear) {
            return res.status(400).json({
                success: false,
                error:
                    "Academic year is required.",
            });
        }

        if (!semester) {
            return res.status(400).json({
                success: false,
                error:
                    "Semester is required.",
            });
        }

        if (!periodStart) {
            return res.status(400).json({
                success: false,
                error:
                    "Attendance period start is required.",
            });
        }

        if (!periodEnd) {
            return res.status(400).json({
                success: false,
                error:
                    "Attendance period end is required.",
            });
        }

        if (
            !Array.isArray(students) ||
            students.length === 0
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Students data is required.",
            });
        }

        // ========================================================
        // VALIDATE DATES
        // ========================================================

        if (
            new Date(periodStart) >
            new Date(periodEnd)
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Period start cannot be after period end.",
            });
        }

        // ========================================================
        // COUNTERS
        // ========================================================

        let studentsCreated = 0;
        let studentsUpdated = 0;

        let subjectsCreated = 0;
        let subjectsFound = 0;

        let attendanceCreated = 0;
        let attendanceUpdated = 0;

        let growthHourCreated = 0;
        let growthHourUpdated = 0;

        let skippedStudents = 0;
        let skippedSubjects = 0;

        // ========================================================
        // PROCESS STUDENTS
        // ========================================================

        for (
            const studentData of students
        ) {
            try {
                const email =
                    cleanString(
                        studentData.email
                    );

                if (!email) {
                    console.warn(
                        "Skipping student without email."
                    );

                    skippedStudents++;

                    continue;
                }

                // ====================================================
                // STUDENT
                // ====================================================

                const studentResult =
                    await createOrUpdateStudent(
                        studentData
                    );

                const student =
                    studentResult.student;

                if (
                    studentResult.created
                ) {
                    studentsCreated++;
                }

                if (
                    studentResult.updated
                ) {
                    studentsUpdated++;
                }

                console.log(
                    `Student processed: ${email}`
                );

                // ====================================================
                // NORMAL SUBJECTS
                // ====================================================

                const subjects =
                    Array.isArray(
                        studentData.subjects
                    )
                        ? studentData.subjects
                        : [];

                for (
                    const subjectData of subjects
                ) {
                    const subjectId =
                        cleanString(
                            subjectData.id
                        );

                    const subjectName =
                        cleanString(
                            subjectData.name
                        );

                    if (
                        !subjectId ||
                        !subjectName
                    ) {
                        console.warn(
                            `Skipping invalid subject for ${email}`
                        );

                        skippedSubjects++;

                        continue;
                    }

                    // ----------------------------------------------
                    // SUBJECT
                    // ----------------------------------------------

                    const subjectResult =
                        await createOrUpdateSubject(
                            {
                                id: subjectId,
                                name: subjectName,
                                semester,
                            }
                        );

                    if (
                        subjectResult.created
                    ) {
                        subjectsCreated++;
                    } else {
                        subjectsFound++;
                    }

                    // ----------------------------------------------
                    // ATTENDANCE
                    // ----------------------------------------------

                    const attendanceResult =
                        await createOrUpdateAttendance(
                            {
                                studentId:
                                    student.id,

                                subjectId,

                                attendanceType:
                                    "subject",

                                academicYear,

                                semester,

                                periodStart,

                                periodEnd,

                                attendance:
                                    subjectData,
                            }
                        );

                    if (
                        attendanceResult.created
                    ) {
                        attendanceCreated++;
                    }

                    if (
                        attendanceResult.updated
                    ) {
                        attendanceUpdated++;
                    }
                }

                // ====================================================
                // GROWTH HOUR
                // ====================================================

                if (
                    studentData.growthHour
                ) {
                    const growthResult =
                        await createOrUpdateAttendance(
                            {
                                studentId:
                                    student.id,

                                subjectId: null,

                                attendanceType:
                                    "growth_hour",

                                academicYear,

                                semester,

                                periodStart,

                                periodEnd,

                                attendance:
                                    studentData.growthHour,
                            }
                        );

                    if (
                        growthResult.created
                    ) {
                        growthHourCreated++;
                    }

                    if (
                        growthResult.updated
                    ) {
                        growthHourUpdated++;
                    }
                }
            } catch (studentError) {
                console.error(
                    `Failed to process student ${studentData.email}:`,
                    studentError
                );

                skippedStudents++;
            }
        }

        // ========================================================
        // SUCCESS RESPONSE
        // ========================================================

        console.log(
            "================================================"
        );

        console.log(
            "ATTENDANCE IMPORT COMPLETED"
        );

        console.log(
            "================================================"
        );

        return res.status(200).json({
            success: true,

            message:
                "Attendance imported successfully.",

            academicYear,

            semester,

            periodStart,

            periodEnd,

            studentsCreated,

            studentsUpdated,

            subjectsCreated,

            subjectsFound,

            attendanceCreated,

            attendanceUpdated,

            growthHourCreated,

            growthHourUpdated,

            skippedStudents,

            skippedSubjects,
        });
    } catch (error) {
        console.error(
            "================================================"
        );

        console.error(
            "ATTENDANCE IMPORT FAILED"
        );

        console.error(
            "================================================"
        );

        console.error(
            error
        );

        return res.status(500).json({
            success: false,

            error:
                error.message ||
                "Import failed.",

            message:
                "Import failed",
        });
    }
};

const getStudents = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("students")
            .select("*")
            .order("name", { ascending: true });

        if (error) {
            throw error;
        }

        const totals = await getAttendanceTotals();
        const students = (data || []).map((student) => {
            const attendance = getAttendancePercentage(totals.get(student.id));
            return {
                ...student,
                attendance,
                status: attendance >= 75 ? "Present" : "Absent",
            };
        });

        res.json({
            success: true,
            students,
        });
    } catch (error) {
        console.error("Get students error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch students",
            error: error.message,
        });
    }
};

const getAttendanceRecords = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("attendance")
            .select("*, students(name, email, squad), subjects(name)")
            .order("updated_at", { ascending: false });

        if (error) throw error;

        res.json({ success: true, records: data || [] });
    } catch (error) {
        console.error("Get attendance records error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch attendance records",
            error: error.message,
        });
    }
};

const getEmailAlerts = async (req, res) => {
    try {
        const [{ data: students, error: studentsError }, { data: attendance, error: attendanceError }] = await Promise.all([
            supabase.from("students").select("id, name, email, squad, parent_email").order("name", { ascending: true }),
            supabase.from("attendance").select("student_id, sessions_conducted, sessions_attended"),
        ]);

        if (studentsError) throw studentsError;
        if (attendanceError) throw attendanceError;

        const totals = calculateAttendanceByStudent(attendance);
        const alerts = (students || []).map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            parentEmail: student.parent_email || "",
            squad: student.squad,
            attendance: getAttendancePercentage(totals.get(student.id)),
        }));

        res.json({ success: true, students: alerts });
    } catch (error) {
        console.error("Get email alerts error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch email alert data",
            error: error.message,
        });
    }
};

const updateStudentDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            parent_name,
            parent_email,
            parent_phone,
        } = req.body;

        const { data, error } = await supabase
            .from("students")
            .update({
                parent_name: parent_name || null,
                parent_email: parent_email || null,
                parent_phone: parent_phone || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: "Student details updated successfully",
            student: data,
        });
    } catch (error) {
        console.error("Update student details error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update student details",
            error: error.message,
        });
    }
};

module.exports = {
    testSupabase,
    testAttendanceInsert,
    importAttendance,
    getStudents,
    getAttendanceRecords,
    getEmailAlerts,
    updateStudentDetails,
};