import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.warn("Supabase env vars missing — realtime updates will not work.");
}

export const supabase = createClient(url ?? "http://invalid", key ?? "invalid", {
  auth: { persistSession: false },
});
