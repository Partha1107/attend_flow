import { createClient } from "@supabase/supabase-js";

const readEnv = (...keys) =>
  keys
    .map((key) => import.meta.env[key])
    .find((value) => typeof value === "string" && value.trim().length > 0);

const supabaseUrl = readEnv(
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
  "REACT_APP_SUPABASE_URL"
);
const supabaseAnonKey = readEnv(
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "REACT_APP_SUPABASE_ANON_KEY"
);

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env (or SUPABASE_/REACT_APP_ equivalents), then restart Vite."
    : null;

if (supabaseConfigError) {
  console.error(supabaseConfigError);
}

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);