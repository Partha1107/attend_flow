const supabase = require("../config/supabase");

const testSupabase = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("students")
            .select("*")
            .limit(1);

        if (error) {
            return res.status(500).json({
                success: false,
                message: "Supabase connection failed",
                error: error.message,
            });
        }

        res.json({
            success: true,
            message: "Supabase connection working",
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unexpected error",
            error: error.message,
        });
    }
};

const testAttendanceInsert = async (req, res) => {
    try {
        const {
            email,
            name,
            squad,
            subject_id,
            subject_name,
            academic_year,
            sessions_conducted,
            sessions_attended,
        } = req.body;

        // 1. Validate required fields
        if (
            !email ||
            !name ||
            !squad ||
            !subject_id ||
            !subject_name ||
            !academic_year
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        // 2. Find or create student
        let { data: student, error: studentError } = await supabase
            .from("students")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        if (studentError) {
            throw studentError;
        }

        if (!student) {
            const { data: newStudent, error } = await supabase
                .from("students")
                .insert({
                    email,
                    name,
                    squad,
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            student = newStudent;
        }

        // 3. Find or create subject
        let { data: subject, error: subjectError } = await supabase
            .from("subjects")
            .select("*")
            .eq("id", subject_id)
            .maybeSingle();

        if (subjectError) {
            throw subjectError;
        }

        if (!subject) {
            const { data: newSubject, error } = await supabase
                .from("subjects")
                .insert({
                    id: subject_id,
                    name: subject_name,
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            subject = newSubject;
        }

        /// 4. Insert attendance
        const conducted = Number(sessions_conducted || 0);
        const attended = Number(sessions_attended || 0);
        const absent = Math.max(conducted - attended, 0);

        const percentage =
            conducted > 0
                ? Number(((attended / conducted) * 100).toFixed(2))
                : 0;

        const {
            data: attendance,
            error: attendanceError,
        } = await supabase
            .from("attendance")
            .insert({
                student_id: student.id,
                subject_id: subject.id,
                attendance_type: "subject",
                academic_year: academic_year,

                sessions_conducted: conducted,
                sessions_attended: attended,
                sessions_absent: absent,
                attendance_percentage: percentage,

                sessions_marked_od: 0,
                sessions_medical_leave: 0,
                sessions_applied_leave: 0,
            })
            .select()
            .single();

        if (attendanceError) {
            throw attendanceError;
        }

        // 5. Return everything
        res.status(201).json({
            success: true,
            message: "Test attendance inserted successfully",
            student,
            subject,
            attendance,
        });

    } catch (error) {
        console.error("Test attendance error:", error);

        res.status(500).json({
            success: false,
            message: "Test attendance insert failed",
            error: error.message,
        });
    }
};

const importAttendance = async (req, res) => {
    try {
        console.time("TOTAL IMPORT");
        console.log("IMPORT STARTED");

        const { academicYear, students } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (!academicYear) {
            return res.status(400).json({
                success: false,
                message: "Academic year is required",
            });
        }

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Students data is required",
            });
        }

        let studentsCreated = 0;
        let studentsUpdated = 0;
        let subjectsCreated = 0;
        let subjectsFound = 0;
        let attendanceCreated = 0;
        let attendanceUpdated = 0;
        let growthHourCreated = 0;
        let growthHourUpdated = 0;

        const now = new Date().toISOString();

        // ==========================================
        // CLEAN STUDENT DATA
        // ==========================================

        const validStudents = students.filter(
            (student) =>
                student.email &&
                student.name &&
                student.squad
        );

        if (validStudents.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid students found",
            });
        }

        // ==========================================
        // 1. FETCH ALL EXISTING STUDENTS AT ONCE
        // ==========================================

        const emails = validStudents.map(
            (student) => student.email
        );

        const {
            data: existingStudents,
            error: studentsFetchError,
        } = await supabase
            .from("students")
            .select("*")
            .in("email", emails);

        if (studentsFetchError) {
            throw studentsFetchError;
        }

        const existingStudentMap = new Map(
            (existingStudents || []).map(
                (student) => [
                    student.email,
                    student,
                ]
            )
        );

        // ==========================================
        // 2. CREATE NEW STUDENTS IN ONE REQUEST
        // ==========================================

        const newStudentRows = validStudents
            .filter(
                (student) =>
                    !existingStudentMap.has(
                        student.email
                    )
            )
            .map((student) => ({
                email: student.email,
                name: student.name,
                squad: student.squad,
            }));

        if (newStudentRows.length > 0) {
            const {
                data: createdStudents,
                error: createStudentsError,
            } = await supabase
                .from("students")
                .insert(newStudentRows)
                .select();

            if (createStudentsError) {
                throw createStudentsError;
            }

            studentsCreated =
                createdStudents.length;

            createdStudents.forEach(
                (student) => {
                    existingStudentMap.set(
                        student.email,
                        student
                    );
                }
            );
        }

        // ==========================================
        // 3. UPDATE EXISTING STUDENTS IN PARALLEL
        // ==========================================

        const existingStudentUpdates =
            validStudents
                .filter((student) =>
                    (existingStudents || []).some(
                        (existing) =>
                            existing.email === student.email
                    )
                )
                .map((student) => {
                    const existing =
                        existingStudentMap.get(
                            student.email
                        );

                    return supabase
                        .from("students")
                        .update({
                            name: student.name,
                            squad: student.squad,
                            updated_at: now,
                        })
                        .eq("id", existing.id)
                        .select()
                        .single();
                });

        if (existingStudentUpdates.length > 0) {
            const results = await Promise.all(
                existingStudentUpdates
            );

            results.forEach((result) => {
                if (result.error) {
                    throw result.error;
                }

                if (result.data) {
                    existingStudentMap.set(
                        result.data.email,
                        result.data
                    );
                }
            });

            studentsUpdated =
                existingStudentUpdates.length;
        }

        // ==========================================
        // 4. COLLECT ALL NORMAL SUBJECTS
        // ==========================================

        const subjectMap = new Map();

        validStudents.forEach((student) => {
            const subjects =
                Array.isArray(student.subjects)
                    ? student.subjects
                    : [];

            subjects.forEach((subject) => {
                const subjectId =
                    subject.id
                        ? String(subject.id).trim()
                        : "";

                const subjectName =
                    subject.name
                        ? String(subject.name).trim()
                        : "";

                if (
                    !subjectId ||
                    !subjectName
                ) {
                    return;
                }

                subjectMap.set(
                    subjectId,
                    {
                        id: subjectId,
                        name: subjectName,
                    }
                );
            });
        });

        const subjectIds = [
            ...subjectMap.keys(),
        ];

        // ==========================================
        // 5. FETCH ALL SUBJECTS AT ONCE
        // ==========================================

        let existingSubjects = [];

        if (subjectIds.length > 0) {
            const {
                data,
                error: subjectsFetchError,
            } = await supabase
                .from("subjects")
                .select("*")
                .in("id", subjectIds);

            if (subjectsFetchError) {
                throw subjectsFetchError;
            }

            existingSubjects = data || [];
        }

        const existingSubjectMap =
            new Map(
                existingSubjects.map(
                    (subject) => [
                        String(subject.id),
                        subject,
                    ]
                )
            );

        subjectsFound =
            existingSubjects.length;

        // ==========================================
        // 6. CREATE MISSING SUBJECTS IN ONE REQUEST
        // ==========================================

        const newSubjectRows =
            subjectIds
                .filter(
                    (id) =>
                        !existingSubjectMap.has(
                            id
                        )
                )
                .map((id) =>
                    subjectMap.get(id)
                );

        if (newSubjectRows.length > 0) {
            const {
                data: createdSubjects,
                error: createSubjectsError,
            } = await supabase
                .from("subjects")
                .insert(newSubjectRows)
                .select();

            if (createSubjectsError) {
                throw createSubjectsError;
            }

            subjectsCreated =
                createdSubjects.length;

            createdSubjects.forEach(
                (subject) => {
                    existingSubjectMap.set(
                        String(subject.id),
                        subject
                    );
                }
            );
        }

        // ==========================================
        // 7. FETCH EXISTING ATTENDANCE AT ONCE
        // ==========================================

        const studentIds = validStudents.map(
            (student) =>
                existingStudentMap.get(
                    student.email
                ).id
        );

        let existingAttendance = [];

        if (
            studentIds.length > 0 &&
            subjectIds.length > 0
        ) {
            const {
                data,
                error: attendanceFetchError,
            } = await supabase
                .from("attendance")
                .select("*")
                .in(
                    "student_id",
                    studentIds
                )
                .in(
                    "subject_id",
                    subjectIds
                )
                .eq(
                    "academic_year",
                    academicYear
                );

            if (attendanceFetchError) {
                throw attendanceFetchError;
            }

            existingAttendance =
                data || [];
        }

        const attendanceMap = new Map();

        existingAttendance.forEach(
            (attendance) => {
                const key =
                    `${attendance.student_id}_${attendance.subject_id}_${attendance.academic_year}`;

                attendanceMap.set(
                    key,
                    attendance
                );
            }
        );

        // ==========================================
        // 8. BUILD ALL ATTENDANCE ROWS
        // ==========================================

        const attendanceRows = [];

        validStudents.forEach(
            (studentData) => {
                const student =
                    existingStudentMap.get(
                        studentData.email
                    );

                if (!student) return;

                const subjects =
                    Array.isArray(
                        studentData.subjects
                    )
                        ? studentData.subjects
                        : [];

                subjects.forEach(
                    (subjectData) => {
                        const subjectId =
                            subjectData.id
                                ? String(
                                    subjectData.id
                                ).trim()
                                : "";

                        if (
                            !subjectId ||
                            !subjectData.name
                        ) {
                            return;
                        }

                        const subject =
                            existingSubjectMap.get(
                                subjectId
                            );

                        if (!subject) return;

                        const attendanceData = {
                            student_id:
                                student.id,

                            subject_id:
                                subject.id,

                            attendance_type:
                                "subject",

                            academic_year:
                                academicYear,

                            sessions_conducted:
                                Number(
                                    subjectData.sessionsConducted
                                ) || 0,

                            sessions_attended:
                                Number(
                                    subjectData.sessionsAttended
                                ) || 0,

                            sessions_absent:
                                Number(
                                    subjectData.sessionsAbsent
                                ) || 0,

                            attendance_percentage:
                                parseFloat(
                                    String(
                                        subjectData.attendancePercentage ??
                                        0
                                    ).replace(
                                        "%",
                                        ""
                                    )
                                ) || 0,

                            sessions_marked_od:
                                Number(
                                    subjectData.sessionsMarkedOD
                                ) || 0,

                            sessions_medical_leave:
                                Number(
                                    subjectData.sessionsMedicalLeave
                                ) || 0,

                            sessions_applied_leave:
                                Number(
                                    subjectData.sessionsAppliedLeave
                                ) || 0,

                            updated_at: now,
                        };

                        attendanceRows.push(
                            attendanceData
                        );

                        const key =
                            `${student.id}_${subject.id}_${academicYear}`;

                        if (
                            attendanceMap.has(
                                key
                            )
                        ) {
                            attendanceUpdated++;
                        } else {
                            attendanceCreated++;
                        }
                    }
                );
            }
        );

        // ==========================================
        // 9. UPSERT ALL NORMAL ATTENDANCE
        // ==========================================

        if (attendanceRows.length > 0) {
            const {
                error: attendanceUpsertError,
            } = await supabase
                .from("attendance")
                .upsert(attendanceRows, {
                    onConflict:
                        "student_id,subject_id,academic_year",
                });

            if (attendanceUpsertError) {
                throw attendanceUpsertError;
            }
        }

        // ==========================================
        // 10. BUILD GROWTH HOUR ROWS
        // ==========================================

        const growthHourRows = [];

        validStudents.forEach(
            (studentData) => {
                const growthHour =
                    studentData.growthHour;

                if (!growthHour) return;

                const student =
                    existingStudentMap.get(
                        studentData.email
                    );

                if (!student) return;

                growthHourRows.push({
                    student_id:
                        student.id,

                    academic_year:
                        academicYear,

                    sessions_conducted:
                        Number(
                            growthHour.sessionsConducted
                        ) || 0,

                    sessions_attended:
                        Number(
                            growthHour.sessionsAttended
                        ) || 0,

                    sessions_absent:
                        Number(
                            growthHour.sessionsAbsent
                        ) || 0,

                    attendance_percentage:
                        parseFloat(
                            String(
                                growthHour.attendancePercentage ??
                                0
                            ).replace(
                                "%",
                                ""
                            )
                        ) || 0,

                    sessions_marked_od:
                        Number(
                            growthHour.sessionsMarkedOD
                        ) || 0,

                    sessions_medical_leave:
                        Number(
                            growthHour.sessionsMedicalLeave
                        ) || 0,

                    sessions_applied_leave:
                        Number(
                            growthHour.sessionsAppliedLeave
                        ) || 0,

                    updated_at: now,
                });
            }
        );

        // ==========================================
        // 11. FETCH EXISTING GROWTH HOURS
        // ==========================================

        let existingGrowthHours = [];

        if (studentIds.length > 0) {
            const {
                data,
                error: growthFetchError,
            } = await supabase
                .from(
                    "growth_hour_attendance"
                )
                .select("*")
                .in(
                    "student_id",
                    studentIds
                )
                .eq(
                    "academic_year",
                    academicYear
                );

            if (growthFetchError) {
                throw growthFetchError;
            }

            existingGrowthHours =
                data || [];
        }

        const growthHourMap =
            new Map();

        existingGrowthHours.forEach(
            (row) => {
                const key =
                    `${row.student_id}_${row.academic_year}`;

                growthHourMap.set(
                    key,
                    row
                );
            }
        );

        growthHourRows.forEach((row) => {
            const key =
                `${row.student_id}_${row.academic_year}`;

            if (
                growthHourMap.has(key)
            ) {
                growthHourUpdated++;
            } else {
                growthHourCreated++;
            }
        });

        // ==========================================
        // 12. UPSERT GROWTH HOUR
        // ==========================================

        if (growthHourRows.length > 0) {
            const {
                error: growthHourUpsertError,
            } = await supabase
                .from(
                    "growth_hour_attendance"
                )
                .upsert(
                    growthHourRows,
                    {
                        onConflict:
                            "student_id,academic_year",
                    }
                );

            if (growthHourUpsertError) {
                throw growthHourUpsertError;
            }
        }

        // ==========================================
        // RESPONSE
        // ==========================================

        res.json({
            success: true,
            message:
                "Attendance imported successfully",

            academicYear,

            studentsReceived:
                students.length,

            studentsCreated,

            studentsUpdated,

            subjectsCreated,

            subjectsFound,

            attendanceCreated,

            attendanceUpdated,

            growthHourCreated,

            growthHourUpdated,
        });

    } catch (error) {
        console.error(
            "Import attendance error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Import failed",
            error: error.message,
        });
    }
};

module.exports = {
    testSupabase,
    testAttendanceInsert,
    importAttendance,
};