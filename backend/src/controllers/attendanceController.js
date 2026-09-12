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
// EXTRACT ATTENDANCE PERIOD FROM FILE NAME
// ============================================================

const extractAttendancePeriodFromFileName = (
    fileName
) => {
    const name = cleanString(fileName);

    const match = name.match(
        /_(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})\.(xlsx|xls)$/i
    );

    if (!match) {
        return null;
    }

    const [
        ,
        periodStart,
        periodEnd,
    ] = match;

    return {
        periodStart,
        periodEnd,
    };
};

// ============================================================
// CALCULATE OVERALL ATTENDANCE FROM IMPORT
// ============================================================

const calculateOverallAttendanceFromImport = (studentData) => {
    let totalAttended = 0;
    let totalConducted = 0;

    // 7 normal subjects
    if (Array.isArray(studentData?.subjects)) {
        for (const subject of studentData.subjects) {
            totalAttended +=
                toNumber(subject?.sessionsAttended);

            totalConducted +=
                toNumber(subject?.sessionsConducted);
        }
    }

    // Growth Hour
    if (studentData?.growthHour) {
        totalAttended +=
            toNumber(
                studentData.growthHour?.sessionsAttended
            );

        totalConducted +=
            toNumber(
                studentData.growthHour?.sessionsConducted
            );
    }

    const attendancePercentage =
        totalConducted > 0
            ? Number(
                (
                    (totalAttended / totalConducted) *
                    100
                ).toFixed(2)
            )
            : 0;

    return {
        totalAttended,
        totalConducted,
        attendancePercentage,
    };
};

// ============================================================
// TEST SUPABASE
// ============================================================

const testSupabase = async (
    req,
    res
) => {
    try {
        const {
            data,
            error,
        } = await supabase
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
            message:
                "Supabase connection working",
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
        const {
            data: student,
            error: studentError,
        } = await supabase
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

        const testAttendance = {
            student_id: student.id,

            subject_id:
                "TEST-SUBJECT",

            attendance_type:
                "subject",

            semester:
                "Sem 1",

            period_start:
                "2026-08-01",

            period_end:
                "2026-08-10",

            sessions_conducted:
                10,

            sessions_attended:
                8,

            sessions_absent:
                2,

            attendance_percentage:
                80,

            sessions_marked_od:
                0,

            sessions_medical_leave:
                0,

            sessions_applied_leave:
                0,
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

    const parentName = cleanString(
        student.parent_name ||
        student.parentName
    );

    const parentEmail = cleanString(
        student.parent_email ||
        student.parentEmail
    );

    const parentPhone = cleanString(
        student.parent_phone ||
        student.parentPhone
    );

    if (!email) {
        throw new Error(
            "Student email is missing."
        );
    }

    const existingStudent =
        await findStudentByEmail(
            email
        );

    // ----------------------------------------------------------
    // UPDATE EXISTING STUDENT
    // ----------------------------------------------------------

    if (existingStudent) {
        const updateData = {
            name,

            squad,

            parent_name:
                parentName ||
                existingStudent.parent_name ||
                null,

            parent_email:
                parentEmail ||
                existingStudent.parent_email ||
                null,

            parent_phone:
                parentPhone ||
                existingStudent.parent_phone ||
                null,
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
    // CREATE NEW STUDENT
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

            parent_name:
                parentName || null,

            parent_email:
                parentEmail || null,

            parent_phone:
                parentPhone || null,
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

    const existingSubject =
        await findSubject(
            subjectId
        );

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
            .eq("id", subjectId)
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
            "attendance_type",
            attendanceType
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
        );

    // ----------------------------------------------------------
    // NORMAL SUBJECT
    // ----------------------------------------------------------

    if (
        attendanceType ===
        "subject"
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
        attendanceType ===
        "growth_hour"
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

const createOrUpdateAttendance =
    async ({
        studentId,
        subjectId,
        attendanceType,
        semester,
        periodStart,
        periodEnd,
        attendance,
    }) => {
        const sessionsConducted =
            toNumber(
                attendance.sessionsConducted
            );

        const sessionsAttended =
            toNumber(
                attendance.sessionsAttended
            );

        const sessionsAbsent =
            toNumber(
                attendance.sessionsAbsent
            );
            
        const attendancePercentage =
            toNumber(
                attendance.attendancePercentage
            );





        const attendanceData = {
            student_id:
                studentId,

            subject_id:
                attendanceType ===
                    "growth_hour"
                    ? null
                    : subjectId,

            attendance_type:
                attendanceType,

            semester,

            period_start:
                periodStart,

            period_end:
                periodEnd,

            sessions_conducted:
                sessionsConducted,

            sessions_attended:
                sessionsAttended,

            sessions_absent:
                sessionsAbsent,

            attendance_percentage:
                attendancePercentage,

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

        const existingAttendance =
            await findExistingAttendance({
                studentId,
                subjectId,
                attendanceType,
                semester,
                periodStart,
                periodEnd,
            });

        // ------------------------------------------------------
        // UPDATE EXISTING
        // ------------------------------------------------------

        if (existingAttendance) {
            const {
                data,
                error,
            } = await supabase
                .from("attendance")
                .update(
                    attendanceData
                )
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

        // ------------------------------------------------------
        // INSERT NEW
        // ------------------------------------------------------

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
// BULK FETCH EXISTING STUDENTS
// ============================================================

const getExistingStudentsByEmails = async (emails) => {
    const uniqueEmails = [
        ...new Set(
            emails
                .map((email) => cleanString(email))
                .filter(Boolean)
        ),
    ];

    if (uniqueEmails.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from("students")
        .select("*")
        .in("email", uniqueEmails);

    if (error) {
        throw new Error(
            `Failed to fetch existing students: ${error.message}`
        );
    }

    return new Map(
        (data || []).map((student) => [
            cleanString(student.email),
            student,
        ])
    );
};

// ============================================================
// BULK FETCH EXISTING SUBJECTS
// ============================================================

const getExistingSubjectsByIds = async (subjectIds) => {
    const uniqueSubjectIds = [
        ...new Set(
            subjectIds
                .map((id) => cleanString(id))
                .filter(Boolean)
        ),
    ];

    if (uniqueSubjectIds.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .in("id", uniqueSubjectIds);

    if (error) {
        throw new Error(
            `Failed to fetch existing subjects: ${error.message}`
        );
    }

    return new Map(
        (data || []).map((subject) => [
            cleanString(subject.id),
            subject,
        ])
    );
};

// ============================================================
// BULK UPSERT STUDENTS
// ============================================================

const bulkUpsertStudents = async (
    students,
    existingStudentsByEmail
) => {
    const rows = [];
    let studentsCreated = 0;
    let studentsUpdated = 0;

    for (const studentData of students) {
        const email = cleanString(studentData.email);

        if (!email) {
            continue;
        }

        const existingStudent =
            existingStudentsByEmail.get(email);

        const parentName = cleanString(
            studentData.parent_name ||
            studentData.parentName
        );

        const parentEmail = cleanString(
            studentData.parent_email ||
            studentData.parentEmail
        );

        const parentPhone = cleanString(
            studentData.parent_phone ||
            studentData.parentPhone
        );

        rows.push({
            ...(existingStudent?.id
                ? { id: existingStudent.id }
                : {}),

            email,

            name: cleanString(studentData.name),

            squad: cleanString(studentData.squad),

            parent_name:
                parentName ||
                existingStudent?.parent_name ||
                null,

            parent_email:
                parentEmail ||
                existingStudent?.parent_email ||
                null,

            parent_phone:
                parentPhone ||
                existingStudent?.parent_phone ||
                null,

            updated_at:
                new Date().toISOString(),
        });

        if (existingStudent) {
            studentsUpdated++;
        } else {
            studentsCreated++;
        }
    }

    if (rows.length === 0) {
        return {
            students: [],
            studentsCreated,
            studentsUpdated,
        };
    }

    const { data, error } = await supabase
        .from("students")
        .upsert(rows, {
            onConflict: "email",
        })
        .select();

    if (error) {
        throw new Error(
            `Failed to bulk upsert students: ${error.message}`
        );
    }

    return {
        students: data || [],
        studentsCreated,
        studentsUpdated,
    };
};

// ============================================================
// BULK UPSERT SUBJECTS
// ============================================================

const bulkUpsertSubjects = async (
    students,
    semester,
    existingSubjectsById
) => {
    const subjectMap = new Map();

    for (const studentData of students) {
        const subjects = Array.isArray(
            studentData.subjects
        )
            ? studentData.subjects
            : [];

        for (const subjectData of subjects) {
            const id = cleanString(subjectData.id);
            const name = cleanString(subjectData.name);

            if (!id || !name) {
                continue;
            }

            subjectMap.set(id, {
                id,
                name,
                semester,
            });
        }
    }

    const rows = [...subjectMap.values()];

    if (rows.length === 0) {
        return {
            subjects: [],
            subjectsCreated: 0,
            subjectsFound: 0,
        };
    }

    let subjectsCreated = 0;
    let subjectsFound = 0;

    for (const subject of rows) {
        if (existingSubjectsById.has(subject.id)) {
            subjectsFound++;
        } else {
            subjectsCreated++;
        }
    }

    const { data, error } = await supabase
        .from("subjects")
        .upsert(rows, {
            onConflict: "id",
        })
        .select();

    if (error) {
        throw new Error(
            `Failed to bulk upsert subjects: ${error.message}`
        );
    }

    return {
        subjects: data || [],
        subjectsCreated,
        subjectsFound,
    };
};

// ============================================================
// DEDUPLICATE ATTENDANCE ROWS
// ============================================================

const dedupeAttendanceRows = (rows) => {
    const map = new Map();

    for (const row of rows) {
        const key = [
            row.student_id,
            row.attendance_type,
            row.semester,
            row.period_start,
            row.period_end,
            row.attendance_type === "growth_hour"
                ? "growth_hour"
                : row.subject_id,
        ].join("|");

        map.set(key, row);
    }

    return [...map.values()];
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

        // ======================================================
        // REQUEST DATA
        // ======================================================

        const {
            fileName,
            semester,
            students,
        } = req.body || {};

        // ======================================================
        // DEBUG
        // ======================================================

        console.log(
            "REQUEST BODY:",
            JSON.stringify(
                req.body,
                null,
                2
            )
        );

        console.log(
            "File Name:",
            fileName
        );

        console.log(
            "Semester:",
            semester
        );

        console.log(
            "Students:",
            students?.length
        );

        // ======================================================
        // VALIDATE FILE NAME
        // ======================================================

        if (!fileName) {
            return res.status(400).json({
                success: false,
                error:
                    "Excel file name is required.",
            });
        }

        // ======================================================
        // EXTRACT PERIOD FROM FILE NAME
        // ======================================================

        const attendancePeriod =
            extractAttendancePeriodFromFileName(
                fileName
            );

        if (!attendancePeriod) {
            return res.status(400).json({
                success: false,
                error:
                    "Invalid Excel filename. Expected format: attendance_report_squad_138_2026-07-23_to_2026-08-19.xlsx",
            });
        }

        const {
            periodStart,
            periodEnd,
        } = attendancePeriod;

        console.log(
            "Extracted Period:",
            periodStart,
            "→",
            periodEnd
        );

        // ======================================================
        // VALIDATE SEMESTER
        // ======================================================

        if (!semester) {
            return res.status(400).json({
                success: false,
                error:
                    "Semester is required.",
            });
        }

        // ======================================================
        // VALIDATE STUDENTS
        // ======================================================

        if (
            !Array.isArray(
                students
            ) ||
            students.length === 0
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Students data is required.",
            });
        }

        // ======================================================
        // VALIDATE DATES
        // ======================================================

        const startDate =
            new Date(
                `${periodStart}T00:00:00`
            );

        const endDate =
            new Date(
                `${periodEnd}T00:00:00`
            );

        if (
            Number.isNaN(
                startDate.getTime()
            ) ||
            Number.isNaN(
                endDate.getTime()
            )
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Invalid attendance period dates.",
            });
        }

        if (
            startDate >
            endDate
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Period start cannot be after period end.",
            });
        }

        // ======================================================
        // COUNTERS
        // ======================================================

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

        const overallAttendanceRows = [];
        const attendanceRows = [];

        // ========================================================
        // BULK LOAD EXISTING STUDENTS + SUBJECTS
        // ========================================================

        const studentEmails = students.map((student) =>
            cleanString(student.email)
        );

        const subjectIds = students.flatMap((student) =>
            Array.isArray(student.subjects)
                ? student.subjects.map((subject) =>
                    cleanString(subject.id)
                )
                : []
        );

        const [
            existingStudentsByEmail,
            existingSubjectsById,
        ] = await Promise.all([
            getExistingStudentsByEmails(studentEmails),
            getExistingSubjectsByIds(subjectIds),
        ]);

        console.log(
            `Existing students loaded: ${existingStudentsByEmail.size}`
        );

        console.log(
            `Existing subjects loaded: ${existingSubjectsById.size}`
        );

        // ======================================================
        // PROCESS STUDENTS
        // ======================================================

        // ========================================================
        // BULK UPSERT STUDENTS
        // ========================================================

        const bulkStudentResult =
            await bulkUpsertStudents(
                students,
                existingStudentsByEmail
            );

        studentsCreated =
            bulkStudentResult.studentsCreated;

        studentsUpdated =
            bulkStudentResult.studentsUpdated;

        const studentMap = new Map(
            bulkStudentResult.students.map(
                (student) => [
                    cleanString(student.email),
                    student,
                ]
            )
        );

        // ========================================================
        // BULK UPSERT SUBJECTS
        // ========================================================

        const bulkSubjectResult =
            await bulkUpsertSubjects(
                students,
                semester,
                existingSubjectsById
            );

        subjectsCreated =
            bulkSubjectResult.subjectsCreated;

        subjectsFound =
            bulkSubjectResult.subjectsFound;

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

                // ==================================================
                // STUDENT
                // ==================================================

                const student = studentMap.get(email);

                if (!student) {
                    console.warn(
                        `Student not found after bulk upsert: ${email}`
                    );

                    skippedStudents++;
                    continue;
                }

                console.log(
                    `Student loaded from bulk result: ${email}`
                );

                // ==================================================
                // NORMAL SUBJECTS
                // ==================================================

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

                    // Subject already bulk upserted, skip individual queries

                    // ----------------------------------------------
                    // ATTENDANCE
                    // ----------------------------------------------

                    attendanceRows.push({
                        student_id: student.id,
                        subject_id: subjectId,
                        attendance_type: "subject",
                        semester,
                        period_start: periodStart,
                        period_end: periodEnd,

                        sessions_conducted:
                            toNumber(subjectData.sessionsConducted),

                        sessions_attended:
                            toNumber(subjectData.sessionsAttended),

                        sessions_absent:
                            toNumber(subjectData.sessionsAbsent),

                        attendance_percentage:
                            toNumber(subjectData.attendancePercentage),

                        sessions_marked_od:
                            toNumber(subjectData.sessionsMarkedOD),

                        sessions_medical_leave:
                            toNumber(subjectData.sessionsMedicalLeave),

                        sessions_applied_leave:
                            toNumber(subjectData.sessionsAppliedLeave),
                    });
                }

                // ==================================================
                // GROWTH HOUR
                // ==================================================

                if (
                    studentData.growthHour
                ) {
                    attendanceRows.push({
                        student_id: student.id,
                        subject_id: null,
                        attendance_type: "growth_hour",
                        semester,
                        period_start: periodStart,
                        period_end: periodEnd,

                        sessions_conducted:
                            toNumber(
                                studentData.growthHour.sessionsConducted
                            ),

                        sessions_attended:
                            toNumber(
                                studentData.growthHour.sessionsAttended
                            ),

                        sessions_absent:
                            toNumber(
                                studentData.growthHour.sessionsAbsent
                            ),

                        attendance_percentage:
                            toNumber(
                                studentData.growthHour.attendancePercentage
                            ),

                        sessions_marked_od:
                            toNumber(
                                studentData.growthHour.sessionsMarkedOD
                            ),

                        sessions_medical_leave:
                            toNumber(
                                studentData.growthHour.sessionsMedicalLeave
                            ),

                        sessions_applied_leave:
                            toNumber(
                                studentData.growthHour.sessionsAppliedLeave
                            ),
                    });
                }

                // ==================================================
                // CALCULATE OVERALL ATTENDANCE AFTER ALL PROCESSING
                // ==================================================

                const overall =
                    calculateOverallAttendanceFromImport(
                        studentData
                    );

                overallAttendanceRows.push({
                    student_id: student.id,

                    total_sessions_attended:
                        overall.totalAttended,

                    total_sessions_conducted:
                        overall.totalConducted,

                    attendance_percentage:
                        overall.attendancePercentage,

                    updated_at:
                        new Date().toISOString(),
                });
            } catch (
            studentError
            ) {
                console.error(
                    `Failed to process student ${studentData.email}:`,
                    studentError
                );

                skippedStudents++;
            }
        }

        // ========================================================
        // BULK ATTENDANCE UPSERT
        // ========================================================

        const dedupedAttendanceRows =
            dedupeAttendanceRows(attendanceRows);

        console.log(
            `Attendance rows: ${attendanceRows.length} → ${dedupedAttendanceRows.length} after deduplication`
        );

        if (dedupedAttendanceRows.length > 0) {
            const { data: attendanceCount, error } =
                await supabase.rpc(
                    "upsert_attendance_bulk",
                    {
                        p_rows: dedupedAttendanceRows,
                    }
                );

            if (error) {
                throw new Error(
                    `Failed to bulk upsert attendance: ${error.message}`
                );
            }

            console.log(
                `Bulk attendance processed: ${attendanceCount} records`
            );
        }

        // ========================================================
        // DEDUPLICATE OVERALL ATTENDANCE ROWS
        // ========================================================

        const dedupedOverallAttendanceRows = [
            ...new Map(
                overallAttendanceRows.map((row) => [
                    row.student_id,
                    row,
                ])
            ).values(),
        ];

        // ========================================================
        // UPDATE OVERALL ATTENDANCE
        // ========================================================

        if (dedupedOverallAttendanceRows.length > 0) {
            const { error: overallAttendanceError } =
                await supabase
                    .from("overall_attendance")
                    .upsert(
                        dedupedOverallAttendanceRows,
                        {
                            onConflict: "student_id",
                        }
                    );

            if (overallAttendanceError) {
                throw new Error(
                    `Failed to update overall attendance: ${overallAttendanceError.message}`
                );
            }

            console.log(
                `Overall attendance updated for ${dedupedOverallAttendanceRows.length} students.`
            );
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

            fileName,

            semester,

            periodStart,

            periodEnd,

            studentsCreated,

            studentsUpdated,

            subjectsCreated,

            subjectsFound,

            attendanceProcessed:
                attendanceRows.length,

            growthHourProcessed:
                attendanceRows.filter(
                    (row) =>
                        row.attendance_type ===
                        "growth_hour"
                ).length,

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

        console.error(error);

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

// ============================================================
// GET STUDENTS
// ============================================================

const getStudents = async (
    req,
    res
) => {
    try {
        const { data, error } = await supabase
            .from("students")
            .select(`
                *,
                overall_attendance (
                    total_sessions_attended,
                    total_sessions_conducted,
                    attendance_percentage,
                    updated_at
                )
            `)
            .order("name", {
                ascending: true,
            });

        if (error) {
            throw error;
        }

        const students = (data || []).map((student) => {
            const overall =
                Array.isArray(student.overall_attendance)
                    ? student.overall_attendance[0]
                    : student.overall_attendance;

            const attendance = Number(
                overall?.attendance_percentage || 0
            );

            return {
                ...student,

                // Keep the existing frontend property
                attendance,

                // Optional: useful if you need these later
                totalSessionsAttended:
                    Number(
                        overall?.total_sessions_attended || 0
                    ),

                totalSessionsConducted:
                    Number(
                        overall?.total_sessions_conducted || 0
                    ),

                status:
                    attendance >= 75
                        ? "Present"
                        : "Absent",
            };
        });

        return res.json({
            success: true,
            students,
        });
    } catch (error) {
        console.error(
            "Get students error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch students",
            error: error.message,
        });
    }
};
// ============================================================
// GET EMAIL ALERTS
// ============================================================

const getEmailAlerts =
    async (
        req,
        res
    ) => {
        try {
            const {
                data: mentorProfile,
                error: profileError,
            } = await supabase
                .from(
                    "mentor_profiles"
                )
                .select("squad")
                .eq(
                    "user_id",
                    req.user.id
                )
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            if (!mentorProfile) {
                return res.status(403).json({
                    success: false,

                    profileExists:
                        false,

                    message:
                        "Please complete your mentor profile first.",
                });
            }

            const [
                {
                    data: students,
                    error: studentsError,
                },
                {
                    data: overallAttendance,
                    error: overallAttendanceError,
                },
            ] = await Promise.all([
                supabase
                    .from("students")
                    .select(
                        "id, name, email, squad, parent_email"
                    )
                    .eq(
                        "squad",
                        mentorProfile.squad
                    )
                    .order("name", {
                        ascending: true,
                    }),

                supabase
                    .from("overall_attendance")
                    .select(
                        "student_id, attendance_percentage"
                    ),
            ]);

            if (studentsError) {
                throw studentsError;
            }

            if (overallAttendanceError) {
                throw overallAttendanceError;
            }

            // Create quick lookup:
            // student_id → attendance percentage
            const overallAttendanceMap = new Map(
                (overallAttendance || []).map(
                    (record) => [
                        record.student_id,
                        Number(
                            record.attendance_percentage
                        ) || 0,
                    ]
                )
            );

            const alerts =
                (students || []).map(
                    (student) => ({
                        id: student.id,

                        name: student.name,

                        email: student.email,

                        parentEmail:
                            student.parent_email || "",

                        squad: student.squad,

                        attendance:
                            overallAttendanceMap.get(
                                student.id
                            ) || 0,
                    })
                );

            res.json({
                success: true,

                squad:
                    mentorProfile.squad,

                students:
                    alerts,
            });
        } catch (error) {
            console.error(
                "Get email alerts error:",
                error
            );

            res.status(500).json({
                success: false,

                message:
                    "Failed to fetch email alert data",

                error:
                    error.message,
            });
        }
    };

// ============================================================
// UPDATE STUDENT DETAILS
// ============================================================

const updateStudentDetails =
    async (
        req,
        res
    ) => {
        try {
            const {
                id,
            } = req.params;

            const {
                parent_name,
                parent_email,
                parent_phone,
            } = req.body || {};

            const {
                data,
                error,
            } = await supabase
                .from(
                    "students"
                )
                .update({
                    parent_name:
                        parent_name ||
                        null,

                    parent_email:
                        parent_email ||
                        null,

                    parent_phone:
                        parent_phone ||
                        null,

                    updated_at:
                        new Date().toISOString(),
                })
                .eq(
                    "id",
                    id
                )
                .select()
                .single();

            if (error) {
                throw error;
            }

            res.json({
                success: true,

                message:
                    "Student details updated successfully",

                student:
                    data,
            });
        } catch (error) {
            console.error(
                "Update student details error:",
                error
            );

            res.status(500).json({
                success: false,

                message:
                    "Failed to update student details",

                error:
                    error.message,
            });
        }
    };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    testSupabase,

    testAttendanceInsert,

    importAttendance,

    getStudents,

    getEmailAlerts,

    updateStudentDetails,
};