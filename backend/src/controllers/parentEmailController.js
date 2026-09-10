const supabase = require("../config/supabase");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeName = (value) => String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || "").trim());

const createSummary = (totalRows) => ({
    totalRows,
    updated: 0,
    notFound: 0,
    duplicateNames: 0,
    invalidEmails: 0,
    skipped: 0,
});

const importParentEmails = async (req, res) => {
    try {
        const inputStudents = req.body?.students;

        if (!Array.isArray(inputStudents)) {
            return res.status(400).json({
                success: false,
                message: "The students field must be an array.",
            });
        }

        if (inputStudents.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one student record is required.",
            });
        }

        const summary = createSummary(inputStudents.length);
        const { data: existingStudents, error: studentsError } = await supabase
            .from("students")
            .select("id, name");

        if (studentsError) {
            throw studentsError;
        }

        const studentsByName = new Map();

        for (const student of existingStudents || []) {
            const normalizedName = normalizeName(student.name);

            if (!normalizedName) {
                continue;
            }

            const matches = studentsByName.get(normalizedName) || [];
            matches.push(student);
            studentsByName.set(normalizedName, matches);
        }

        const updates = [];

        for (const inputStudent of inputStudents) {
            const name = String(inputStudent?.name || "").trim();
            const parentEmail = String(inputStudent?.parentEmail || "").trim();

            if (!name && !parentEmail) {
                summary.skipped += 1;
                continue;
            }

            if (!isValidEmail(parentEmail)) {
                summary.invalidEmails += 1;
                continue;
            }

            const matches = studentsByName.get(normalizeName(name)) || [];

            if (matches.length === 0) {
                summary.notFound += 1;
                continue;
            }

            if (matches.length > 1) {
                summary.duplicateNames += 1;
                continue;
            }

            updates.push({
                id: matches[0].id,
                parent_email: parentEmail,
                updated_at: new Date().toISOString(),
            });
        }

        const updatesByEmail = new Map();

        for (const update of updates) {
            const ids = updatesByEmail.get(update.parent_email) || [];
            ids.push(update.id);
            updatesByEmail.set(update.parent_email, ids);
        }

        const updateResults = await Promise.all(
            [...updatesByEmail.entries()].map(([parentEmail, studentIds]) =>
                supabase
                    .from("students")
                    .update({
                        parent_email: parentEmail,
                        updated_at: new Date().toISOString(),
                    })
                    .in("id", studentIds)
            )
        );

        const failedUpdate = updateResults.find((result) => result.error);

        if (failedUpdate?.error) {
            throw failedUpdate.error;
        }

        summary.updated = updates.length;

        return res.status(200).json({
            success: true,
            message: "Parent email import completed.",
            result: summary,
        });
    } catch (error) {
        console.error("Parent email import error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to import parent email addresses.",
            error: error.message,
        });
    }
};

module.exports = {
    importParentEmails,
};
