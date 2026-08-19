const supabase = require("../config/supabase");

const importAttendance = async (req, res) => {
    try {
        const { academicYear, students } = req.body;

        // ---------------------------------------
        // 1. Validate request
        // ---------------------------------------

        if (!academicYear) {
            return res.status(400).json({
                success: false,
                message: "Academic year is required.",
            });
        }

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No student attendance data was provided.",
            });
        }

        // ---------------------------------------
        // Counters
        // ---------------------------------------

        let studentsCreated = 0;
        let studentsUpdated = 0;

        let subjectsCreated = 0;
        let subjectsExisting = 0;

        let attendanceCreated = 0;
        let attendanceUpdated = 0;

        let growthHourCreated = 0;
        let growthHourUpdated = 0;

        let skippedStudents = 0;
        let skippedSubjects = 0;

        // ---------------------------------------
        // 2. Process every student
        // ---------------------------------------

        for (const student of students) {
            const {
                email,
                name,
                squad,
                subjects = [],
            } = student;

            if (!email || !name || !squad) {
                console.warn(
                    "Skipping invalid student:",
                    student
                );

                skippedStudents++;
                continue;
            }

            // ---------------------------------------
            // 3. Find student by EMAIL
            // ---------------------------------------

            const {
                data: existingStudent,
                error: studentFindError,
            } = await supabase
                .from("students")
                .select("id")
                .eq("email", email)
                .maybeSingle();

            if (studentFindError) {
                throw studentFindError;
            }

            let studentId;

            // ---------------------------------------
            // 4. Create or update student
            // ---------------------------------------

            if (existingStudent) {
                studentId = existingStudent.id;

                const {
                    error: studentUpdateError,
                } = await supabase
                    .from("students")
                    .update({
                        name,
                        squad,
                    })
                    .eq("id", studentId);

                if (studentUpdateError) {
                    throw studentUpdateError;
                }

                studentsUpdated++;
            } else {
                const {
                    data: newStudent,
                    error: studentInsertError,
                } = await supabase
                    .from("students")
                    .insert({
                        email,
                        name,
                        squad,
                    })
                    .select("id")
                    .single();

                if (studentInsertError) {
                    throw studentInsertError;
                }

                studentId = newStudent.id;
                studentsCreated++;
            }

            // ---------------------------------------
            // 5. Process subjects
            // ---------------------------------------

            if (!Array.isArray(subjects)) {
                continue;
            }

            for (const subject of subjects) {
                const {
                    id: excelSubjectId,
                    name: subjectName,

                    sessionsConducted,
                    sessionsAttended,
                    sessionsAbsent,
                    attendancePercentage,
                    sessionsMarkedOD,
                    sessionsMedicalLeave,
                    sessionsAppliedLeave,
                } = subject;

                const cleanSubjectName =
                    subjectName?.trim() || "";

                // =======================================
                // GROWTH HOUR
                // =======================================

                const isGrowthHour =
                    cleanSubjectName.toLowerCase() ===
                    "growth hour";

                if (isGrowthHour) {
                    const growthHourData = {
                        student_id: studentId,
                        academic_year: academicYear,

                        sessions_conducted:
                            Number(sessionsConducted) || 0,

                        sessions_attended:
                            Number(sessionsAttended) || 0,

                        sessions_absent:
                            Number(sessionsAbsent) || 0,

                        attendance_percentage:
                            Number(attendancePercentage) || 0,

                        sessions_marked_od:
                            Number(sessionsMarkedOD) || 0,

                        sessions_medical_leave:
                            Number(sessionsMedicalLeave) || 0,

                        sessions_applied_leave:
                            Number(sessionsAppliedLeave) || 0,
                    };

                    // ---------------------------------------
                    // Check existing Growth Hour record
                    // ---------------------------------------

                    const {
                        data: existingGrowthHour,
                        error: growthHourFindError,
                    } = await supabase
                        .from("growth_hour_attendance")
                        .select("id")
                        .eq("student_id", studentId)
                        .eq("academic_year", academicYear)
                        .maybeSingle();

                    if (growthHourFindError) {
                        throw growthHourFindError;
                    }

                    // ---------------------------------------
                    // Update Growth Hour
                    // ---------------------------------------

                    if (existingGrowthHour) {
                        const {
                            error: growthHourUpdateError,
                        } = await supabase
                            .from("growth_hour_attendance")
                            .update(growthHourData)
                            .eq("id", existingGrowthHour.id);

                        if (growthHourUpdateError) {
                            throw growthHourUpdateError;
                        }

                        growthHourUpdated++;
                    }

                    // ---------------------------------------
                    // Create Growth Hour
                    // ---------------------------------------

                    else {
                        const {
                            error: growthHourInsertError,
                        } = await supabase
                            .from("growth_hour_attendance")
                            .insert(growthHourData);

                        if (growthHourInsertError) {
                            throw growthHourInsertError;
                        }

                        growthHourCreated++;
                    }

                    // IMPORTANT:
                    // Do NOT continue processing Growth Hour
                    // as a normal subject.
                    continue;
                }

                // =======================================
                // NORMAL SUBJECT
                // =======================================

                if (!excelSubjectId || !cleanSubjectName) {
                    console.warn(
                        "Skipping invalid subject:",
                        subject
                    );

                    skippedSubjects++;
                    continue;
                }

                // ---------------------------------------
                // Find subject
                // ---------------------------------------

                const {
                    data: existingSubject,
                    error: subjectFindError,
                } = await supabase
                    .from("subjects")
                    .select("id")
                    .eq(
                        "subject_id",
                        String(excelSubjectId)
                    )
                    .maybeSingle();

                if (subjectFindError) {
                    throw subjectFindError;
                }

                let subjectDbId;

                // ---------------------------------------
                // Existing subject
                // ---------------------------------------

                if (existingSubject) {
                    subjectDbId = existingSubject.id;

                    subjectsExisting++;

                    const {
                        error: subjectUpdateError,
                    } = await supabase
                        .from("subjects")
                        .update({
                            subject_name: cleanSubjectName,
                            subject_type: "SUBJECT",
                        })
                        .eq("id", subjectDbId);

                    if (subjectUpdateError) {
                        throw subjectUpdateError;
                    }
                }

                // ---------------------------------------
                // New subject
                // ---------------------------------------

                else {
                    const {
                        data: newSubject,
                        error: subjectInsertError,
                    } = await supabase
                        .from("subjects")
                        .insert({
                            subject_id:
                                String(excelSubjectId),

                            subject_name:
                                cleanSubjectName,

                            subject_type:
                                "SUBJECT",
                        })
                        .select("id")
                        .single();

                    if (subjectInsertError) {
                        throw subjectInsertError;
                    }

                    subjectDbId = newSubject.id;

                    subjectsCreated++;
                }

                // ---------------------------------------
                // Prepare attendance
                // ---------------------------------------

                const attendanceData = {
                    student_id: studentId,

                    subject_id: subjectDbId,

                    academic_year: academicYear,

                    sessions_conducted:
                        Number(sessionsConducted) || 0,

                    sessions_attended:
                        Number(sessionsAttended) || 0,

                    sessions_absent:
                        Number(sessionsAbsent) || 0,

                    attendance_percentage:
                        Number(attendancePercentage) || 0,

                    sessions_marked_od:
                        Number(sessionsMarkedOD) || 0,

                    sessions_medical_leave:
                        Number(sessionsMedicalLeave) || 0,

                    sessions_applied_leave:
                        Number(sessionsAppliedLeave) || 0,
                };

                // ---------------------------------------
                // Upsert normal attendance
                // ---------------------------------------

                const {
                    data: attendanceResult,
                    error: attendanceError,
                } = await supabase
                    .from("attendance")
                    .upsert(
                        attendanceData,
                        {
                            onConflict:
                                "student_id,subject_id,academic_year",
                        }
                    )
                    .select("id");

                if (attendanceError) {
                    throw attendanceError;
                }

                if (attendanceResult?.length > 0) {
                    attendanceUpdated++;
                } else {
                    attendanceCreated++;
                }
            }
        }

        // ---------------------------------------
        // 6. Return summary
        // ---------------------------------------

        return res.status(200).json({
            success: true,

            message:
                "Attendance imported successfully.",

            academicYear,

            summary: {
                studentsCreated,
                studentsUpdated,

                subjectsCreated,
                subjectsExisting,

                attendanceCreated,
                attendanceUpdated,

                growthHourCreated,
                growthHourUpdated,

                skippedStudents,
                skippedSubjects,
            },
        });
    } catch (error) {
        console.error(
            "Attendance import error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to import attendance data.",

            error: error.message,
        });
    }
};

module.exports = {
    importAttendance,
};