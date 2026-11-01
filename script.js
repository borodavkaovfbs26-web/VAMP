
const SUPABASE_URL = "ТВІЙ_PROJECT_URL";
const SUPABASE_PUBLISHABLE_KEY = "ТВІЙ_PUBLISHABLE_KEY";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

window.vampSupabase = supabase;
