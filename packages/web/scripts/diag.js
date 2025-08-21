/* eslint-disable no-console */
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

async function testPg() {
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, error: 'DATABASE_URL missing' };
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const res = await client.query('select current_database() as db, now() as now');
    return { ok: true, row: res.rows[0] };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { await client.end(); } catch {}
  }
}

async function testSupabaseSignUp() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, error: 'Supabase URL/ANON missing' };
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const email = `diag+${Date.now()}@example.com`;
  try {
    const { data, error } = await sb.auth.signUp({ email, password: 'Test12345!' });
    if (error) return { ok: false, error: error.message };
    return { ok: true, userCreated: !!data.user, requiresEmailConfirm: !data.session };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

(async () => {
  const pg = await testPg();
  const supa = await testSupabaseSignUp();
  console.log(JSON.stringify({ pg, supabase: supa }, null, 2));
})();


