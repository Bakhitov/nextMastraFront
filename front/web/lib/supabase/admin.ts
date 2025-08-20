import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase admin env missing");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export type MastraUser = {
  id: string;
  created_at?: string;
  update_at?: string | null;
  type_agent?: string | null;
  source?: string | null;
  contact_id?: string | null;
  name?: string | null;
  api_key_by_type?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  restricted_at?: string | null;
  model_llm?: string | null;
  api_key_llm?: string | null;
  provider_llm?: string | null;
  last_thread_id?: string | null;
  url_by_type?: string | null;
};


