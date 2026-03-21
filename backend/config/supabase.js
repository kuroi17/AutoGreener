const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Missing Supabase credentials in .env file");
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️ Backend is not using SUPABASE_SERVICE_ROLE_KEY. Writes may fail if RLS is enabled.",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
