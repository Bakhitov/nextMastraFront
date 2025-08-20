import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase env missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY)" }, { status: 500 });
    }
    let user: { id: string; email: string | null } | null = null;
    // If service role key is present, create confirmed user to skip email confirmation
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = supabaseAdmin();
        const { data: created, error: adminErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (adminErr || !created.user) {
          return NextResponse.json({ error: adminErr?.message || "Registration failed" }, { status: 400 });
        }
        user = { id: created.user.id, email: created.user.email ?? null };
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Registration failed" }, { status: 400 });
      }
    } else {
      const supabase = createClient(url, anon);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      user = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
    }
    if (user) {
      try {
        const admin = supabaseAdmin();
        await admin.from("mastra_users").upsert(
          {
            id: user.id,
            email,
            is_active: true,
            type_agent: "n8n",
            source: "extension",
            role: "free",
          },
          { onConflict: "id" }
        );
      } catch {}
    }
    return NextResponse.json({ id: user?.id ?? null, email: user?.email ?? email, requiresEmailConfirm: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Registration failed" }, { status: 400 });
  }
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }


