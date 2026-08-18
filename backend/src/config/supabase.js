const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is missing from backend/.env");
}

if (!supabaseAnonKey) {
    throw new Error("SUPABASE_ANON_KEY is missing from backend/.env");
}

const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);

module.exports = supabase;