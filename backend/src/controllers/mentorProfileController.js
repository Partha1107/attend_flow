const supabase = require("../config/supabase");

// =====================================================
// GET CURRENT MENTOR PROFILE
// =====================================================

const getMentorProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const { data, error } = await supabase
            .from("mentor_profiles")
            .select(`
                id,
                user_id,
                email,
                college_name,
                squad,
                job_role,
                is_blocked,
                created_at,
                updated_at
            `)
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            profile: data || null,
        });
    } catch (error) {
        console.error("Get mentor profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load mentor profile.",
            error: error.message,
        });
    }
};


const getMentorRole = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const { data, error } = await supabase
            .from("mentor_profiles")
            .select("job_role")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            jobRole: data?.job_role || "mentor",
        });
    } catch (error) {
        console.error("Get mentor role error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load mentor role.",
        });
    }
};


// =====================================================
// SAVE / UPDATE CURRENT MENTOR PROFILE
// =====================================================

const saveMentorProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const {
            collegeName,
            squad,
            jobRole,
        } = req.body;

        if (!collegeName || !squad || !jobRole) {
            return res.status(400).json({
                success: false,
                message:
                    "College name, squad and job role are required.",
            });
        }

        const allowedJobRoles = [
            "mentor",
            "campus_manager",
        ];

        if (!allowedJobRoles.includes(jobRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job role.",
            });
        }

        const { data: existingProfile, error: findError } =
            await supabase
                .from("mentor_profiles")
                .select("id")
                .eq("user_id", userId)
                .maybeSingle();

        if (findError) {
            throw findError;
        }

        // =================================================
        // UPDATE EXISTING PROFILE
        // =================================================

        if (existingProfile) {
            const { data, error } = await supabase
                .from("mentor_profiles")
                .update({
                    college_name: collegeName.trim(),
                    squad: squad.trim(),
                    job_role: jobRole,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId)
                .select(`
                    id,
                    user_id,
                    email,
                    college_name,
                    squad,
                    job_role,
                    is_blocked,
                    created_at,
                    updated_at
                `)
                .single();

            if (error) {
                throw error;
            }

            return res.status(200).json({
                success: true,
                message: "Mentor profile updated successfully.",
                profile: data,
            });
        }

        // =================================================
        // CREATE NEW PROFILE
        // =================================================

        const { data, error } = await supabase
            .from("mentor_profiles")
            .insert({
                user_id: userId,
                email: req.user.email || null,
                college_name: collegeName.trim(),
                squad: squad.trim(),
                job_role: jobRole,
            })
            .select(`
                id,
                user_id,
                email,
                college_name,
                squad,
                job_role,
                is_blocked,
                created_at,
                updated_at
            `)
            .single();

        if (error) {
            throw error;
        }

        return res.status(201).json({
            success: true,
            message: "Mentor profile created successfully.",
            profile: data,
        });

    } catch (error) {
        console.error("Save mentor profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to save mentor profile.",
            error: error.message,
        });
    }
};


module.exports = {
    getMentorProfile,
    saveMentorProfile,
    getMentorRole,
};