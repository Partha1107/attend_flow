const supabase = require("../config/supabase");

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const token = authHeader.slice("Bearer ".length).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing.",
            });
        }

        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error("Authentication error:", error?.message);

            return res.status(401).json({
                success: false,
                message: "Invalid or expired authentication token.",
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        console.error("Auth middleware error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication failed.",
        });
    }
};

module.exports = { requireAuth };
