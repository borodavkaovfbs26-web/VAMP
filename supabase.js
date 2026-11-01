
const SUPABASE_URL = "https://mwlazyiptxuzihurbatn.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_b5l1fkope7qikVmGryPMZg_DmFFGmB9";

const vampSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.vampSupabase = vampSupabase;
