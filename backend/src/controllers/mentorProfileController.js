const supabase = require("../config/supabase");

// Get mentor profile
const getMentorProfile = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("mentor_profiles")
            .select("*")
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            profile: data || null,
        });
    } catch (error) {
        console.error("Get mentor profile error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load mentor profile",
            error: error.message,
        });
    }
};

// Save mentor profile
const saveMentorProfile = async (req, res) => {
    try {
        const { collegeName, squad } = req.body;

        if (!collegeName || !squad) {
            return res.status(400).json({
                success: false,
                message: "College name and squad are required.",
            });
        }

        const { data: existingProfile, error: findError } =
            await supabase
                .from("mentor_profiles")
                .select("id")
                .limit(1)
                .maybeSingle();

        if (findError) {
            throw findError;
        }

        let data;
        let error;

        if (existingProfile) {
            const result = await supabase
                .from("mentor_profiles")
                .update({
                    college_name: collegeName,
                    squad: squad,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existingProfile.id)
                .select()
                .single();

            data = result.data;
            error = result.error;
        } else {
            const result = await supabase
                .from("mentor_profiles")
                .insert({
                    college_name: collegeName,
                    squad: squad,
                })
                .select()
                .single();

            data = result.data;
            error = result.error;
        }

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: "Mentor profile saved successfully.",
            profile: data,
        });
    } catch (error) {
        console.error("Save mentor profile error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save mentor profile.",
            error: error.message,
        });
    }
};

module.exports = {
    getMentorProfile,
    saveMentorProfile,
};