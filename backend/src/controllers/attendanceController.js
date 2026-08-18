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
                console.warn("Skipping invalid student:", student);
                skippedStudents++;
                continue;
            }

            // ---------------------------------------
            // 3. Find existing student
            // ---------------------------------------

            const {
                data: existingStudent,
                error: studentFindError,
            } = await supabase
                .from("students")
                .select("id")
                .eq("email", email)
                .eq("name", name)
                .eq("squad", squad)
                .maybeSingle();

            if (studentFindError) {
                throw studentFindError;
            }

            let studentId;

            // ---------------------------------------
            // 4. Create or reuse student
            // ---------------------------------------

            if (existingStudent) {
                studentId = existingStudent.id;

                // Keep student information updated
                const {
                    error: studentUpdateError,
                } = await supabase
                    .from("students")
                    .update({
                        email,
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
            // 5. Process ALL subjects
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

                let subjectDbId;

                // =======================================
                // GROWTH HOUR
                // =======================================

                const isGrowthHour =
                    !excelSubjectId &&
                    subjectName?.trim().toLowerCase() ===
                        "growth hour";

                if (isGrowthHour) {
                    const {
                        data: growthHour,
                        error: growthHourError,
                    } = await supabase
                        .from("subjects")
                        .select("id")
                        .eq("subject_type", "GROWTH_HOUR")
                        .maybeSingle();

                    if (growthHourError) {
                        throw growthHourError;
                    }

                    if (!growthHour) {
                        const {
                            data: newGrowthHour,
                            error: growthHourInsertError,
                        } = await supabase
                            .from("subjects")
                            .insert({
                                subject_id: null,
                                subject_name: "Growth Hour",
                                subject_type: "GROWTH_HOUR",
                            })
                            .select("id")
                            .single();

                        if (growthHourInsertError) {
                            throw growthHourInsertError;
                        }

                        subjectDbId = newGrowthHour.id;
                        subjectsCreated++;
                    } else {
                        subjectDbId = growthHour.id;
                        subjectsExisting++;
                    }
                }

                // =======================================
                // NORMAL SUBJECT
                // =======================================

                else {
                    if (!excelSubjectId || !subjectName) {
                        console.warn(
                            "Skipping invalid subject:",
                            subject
                        );

                        skippedSubjects++;
                        continue;
                    }

                    const {
                        data: existingSubject,
                        error: subjectFindError,
                    } = await supabase
                        .from("subjects")
                        .select("id")
                        .eq("subject_id", String(excelSubjectId))
                        .maybeSingle();

                    if (subjectFindError) {
                        throw subjectFindError;
                    }

                    if (existingSubject) {
                        subjectDbId = existingSubject.id;
                        subjectsExisting++;

                        // Keep subject name updated
                        const {
                            error: subjectUpdateError,
                        } = await supabase
                            .from("subjects")
                            .update({
                                subject_name: subjectName,
                                subject_type: "SUBJECT",
                            })
                            .eq("id", subjectDbId);

                        if (subjectUpdateError) {
                            throw subjectUpdateError;
                        }
                    } else {
                        const {
                            data: newSubject,
                            error: subjectInsertError,
                        } = await supabase
                            .from("subjects")
                            .insert({
                                subject_id: String(excelSubjectId),
                                subject_name: subjectName,
                                subject_type: "SUBJECT",
                            })
                            .select("id")
                            .single();

                        if (subjectInsertError) {
                            throw subjectInsertError;
                        }

                        subjectDbId = newSubject.id;
                        subjectsCreated++;
                    }
                }

                // ---------------------------------------
                // 6. Prepare attendance
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
                // 7. Upsert attendance
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
                            ignoreDuplicates: false,
                        }
                    )
                    .select("id");

                if (attendanceError) {
                    throw attendanceError;
                }

                if (attendanceResult?.length > 0) {
                    // We can't reliably distinguish INSERT vs UPDATE
                    // from Supabase upsert alone.
                    attendanceUpdated++;
                } else {
                    attendanceCreated++;
                }
            }
        }

        // ---------------------------------------
        // 8. Return result
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