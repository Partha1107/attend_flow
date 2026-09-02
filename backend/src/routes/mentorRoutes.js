const express = require("express");

const supabase = require("../config/supabase");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("mentor_profiles")
            .select(
                "id, user_id, email, college_name, squad, created_at, updated_at"
            )
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (error) {
            console.error("Get mentor profile error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch mentor profile.",
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                profileExists: false,
                message: "Mentor profile not completed.",
            });
        }

        return res.json({
            success: true,
            profileExists: true,
            profile: data,
        });
    } catch (error) {
        console.error("Mentor profile GET error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
});

router.post("/profile", requireAuth, async (req, res) => {
    try {
        const collegeName = String(req.body.collegeName || "").trim();
        const squad = String(req.body.squad || "").trim();

        if (!collegeName) {
            return res.status(400).json({
                success: false,
                message: "College name is required.",
            });
        }

        if (!squad) {
            return res.status(400).json({
                success: false,
                message: "Squad is required.",
            });
        }

        const { data, error } = await supabase
            .from("mentor_profiles")
            .upsert(
                {
                    user_id: req.user.id,
                    email: req.user.email || "",
                    college_name: collegeName,
                    squad,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            )
            .select()
            .single();

        if (error) {
            console.error("Save mentor profile error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to save mentor profile.",
            });
        }

        return res.json({
            success: true,
            message: "Mentor profile saved successfully.",
            profile: data,
        });
    } catch (error) {
        console.error("Mentor profile POST error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
});

module.exports = router;
