const supabase = require("../config/supabase");

// ============================================================
// HELPERS
// ============================================================

const cleanString = (value) => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
};

// ============================================================
// CHECK CAMPUS MANAGER
// ============================================================

const checkManager = async (userId) => {
    const { data, error } = await supabase
        .from("mentor_profiles")
        .select(
            "user_id, email, job_role, squad, is_blocked"
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        return {
            allowed: false,
            profile: null,
        };
    }

    if (data.job_role !== "campus_manager") {
        return {
            allowed: false,
            profile: data,
        };
    }

    if (data.is_blocked === true) {
        return {
            allowed: false,
            profile: data,
        };
    }

    return {
        allowed: true,
        profile: data,
    };
};

// ============================================================
// GET ALL MENTORS
//
// GET /api/manager/mentors
// ============================================================

const getMentors = async (req, res) => {
    try {
        // ----------------------------------------------------
        // CHECK LOGGED-IN USER
        // ----------------------------------------------------

        const managerCheck = await checkManager(
            req.user.id
        );

        if (!managerCheck.allowed) {
            return res.status(403).json({
                success: false,
                message:
                    "Only an authorized campus manager can access mentor management.",
            });
        }

        // ----------------------------------------------------
        // GET MENTORS
        // ----------------------------------------------------

        const { data, error } = await supabase
            .from("mentor_profiles")
            .select(`
                id,
                user_id,
                email,
                squad,
                job_role,
                is_blocked,
                created_at,
                updated_at
            `)
            .eq("job_role", "mentor")
            .order("email", {
                ascending: true,
            });

        if (error) {
            throw error;
        }

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({
            success: true,
            count: (data || []).length,
            mentors: data || [],
        });

    } catch (error) {
        console.error(
            "Get manager mentors error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch mentors.",
            error: error.message,
        });
    }
};

// ============================================================
// UPDATE MENTOR
//
// PATCH /api/manager/mentors/:id
//
// Can update:
//     squad
//     job_role
//     is_blocked
// ============================================================

const updateMentor = async (req, res) => {
    try {
        // ----------------------------------------------------
        // CHECK LOGGED-IN MANAGER
        // ----------------------------------------------------

        const managerCheck = await checkManager(
            req.user.id
        );

        if (!managerCheck.allowed) {
            return res.status(403).json({
                success: false,
                message:
                    "Only an authorized campus manager can manage mentors.",
            });
        }

        // ----------------------------------------------------
        // GET MENTOR ID
        // ----------------------------------------------------

        const mentorId = cleanString(
            req.params.id
        );

        if (!mentorId) {
            return res.status(400).json({
                success: false,
                message: "Mentor ID is required.",
            });
        }

        // ----------------------------------------------------
        // GET REQUEST BODY
        // ----------------------------------------------------

        const {
            squad,
            job_role,
            is_blocked,
        } = req.body;

        // ----------------------------------------------------
        // FIND MENTOR
        // ----------------------------------------------------

        const {
            data: existingMentor,
            error: mentorError,
        } = await supabase
            .from("mentor_profiles")
            .select(`
                id,
                user_id,
                email,
                squad,
                job_role,
                is_blocked
            `)
            .eq("id", mentorId)
            .maybeSingle();

        if (mentorError) {
            throw mentorError;
        }

        if (!existingMentor) {
            return res.status(404).json({
                success: false,
                message: "Mentor not found.",
            });
        }

        // ----------------------------------------------------
        // BUILD UPDATE OBJECT
        // ----------------------------------------------------

        const updates = {};

        // ----------------------------------------------------
        // SQUAD
        // ----------------------------------------------------

        if (squad !== undefined) {
            const cleanedSquad =
                cleanString(squad);

            if (!cleanedSquad) {
                return res.status(400).json({
                    success: false,
                    message: "Squad cannot be empty.",
                });
            }

            updates.squad = cleanedSquad;
        }

        // ----------------------------------------------------
        // ROLE
        // ----------------------------------------------------

        if (job_role !== undefined) {
            const cleanedRole =
                cleanString(job_role).toLowerCase();

            const allowedRoles = [
                "mentor",
                "campus_manager",
            ];

            if (!allowedRoles.includes(cleanedRole)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid role. Allowed roles are mentor and campus_manager.",
                });
            }

            // -----------------------------------------------
            // PREVENT CURRENT MANAGER FROM CHANGING
            // OWN ROLE
            // -----------------------------------------------

            if (
                existingMentor.user_id ===
                req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You cannot change your own role.",
                });
            }

            updates.job_role = cleanedRole;
        }

        // ----------------------------------------------------
        // ACCESS / BLOCK
        // ----------------------------------------------------

        if (is_blocked !== undefined) {
            if (
                typeof is_blocked !== "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "is_blocked must be true or false.",
                });
            }

            // -----------------------------------------------
            // PREVENT CURRENT MANAGER FROM BLOCKING
            // THEMSELVES
            // -----------------------------------------------

            if (
                existingMentor.user_id ===
                req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You cannot block your own account.",
                });
            }

            updates.is_blocked = is_blocked;
        }

        // ----------------------------------------------------
        // NOTHING TO UPDATE
        // ----------------------------------------------------

        if (
            Object.keys(updates).length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid changes were provided.",
            });
        }

        // ----------------------------------------------------
        // UPDATED TIMESTAMP
        // ----------------------------------------------------

        updates.updated_at =
            new Date().toISOString();

        // ----------------------------------------------------
        // UPDATE DATABASE
        // ----------------------------------------------------

        const {
            data: updatedMentor,
            error: updateError,
        } = await supabase
            .from("mentor_profiles")
            .update(updates)
            .eq("id", mentorId)
            .select(`
                id,
                user_id,
                email,
                squad,
                job_role,
                is_blocked,
                created_at,
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
                "Mentor updated successfully.",
            mentor: updatedMentor,
        });

    } catch (error) {
        console.error(
            "Update manager mentor error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update mentor.",
            error: error.message,
        });
    }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getMentors,
    updateMentor,
};