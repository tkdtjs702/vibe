import { createClient } from "@supabase/supabase-js";

export class SupabaseConfigurationError extends Error {}

export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new SupabaseConfigurationError("Supabase server configuration is missing");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
