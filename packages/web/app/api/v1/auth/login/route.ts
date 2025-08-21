import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";

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
    const supabase = createClient(url, anon);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || "Invalid credentials" }, { status: 401 });
    }
    const { access_token, user } = { access_token: data.session.access_token, user: data.user } as any;
    // read profile row
    let profile: any = null;
    try {
      const admin = supabaseAdmin();
      const { data: row } = await admin.from("mastra_users").select("*").eq("id", user.id).maybeSingle();
      profile = row || null;
    } catch {}
    return NextResponse.json({ accessToken: access_token, user: { id: user.id, email: user.email, profile } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 400 });
  }
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }


