const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const supabase = require("./src/config/supabase");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "AESA Backend is running",
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`AESA Backend running on port ${PORT}`);
});