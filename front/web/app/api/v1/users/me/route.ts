import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { verifyRequest } from "../../../../../lib/auth/verify";
import { redisGetJSON, redisSetJSON, getRedis } from "../../../../../lib/redis/client";

export async function GET(req: Request) {
  try {
    const { sub } = await verifyRequest(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // try cache first
    const cacheKey = `profile:${sub}`;
    const cached = await redisGetJSON(cacheKey);
    if (cached) return NextResponse.json({ profile: cached });
    const admin = supabaseAdmin();
    const { data } = await admin.from("mastra_users").select("*").eq("id", sub).maybeSingle();
    if (data) {
      await redisSetJSON(cacheKey, data, 600); // 10 minutes
    }
    return NextResponse.json({ profile: data || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { sub } = await verifyRequest(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    // allowlist editable fields from extension
    const payload: any = {};
    for (const k of [
      "provider_llm",
      "model_llm",
      "api_key_llm",
      "api_key_by_type",
      "url_by_type",
    ]) {
      if (body[k] !== undefined) payload[k] = body[k];
    }
    if (!payload.provider_llm || !payload.model_llm || !payload.api_key_llm) {
      return NextResponse.json({ error: "provider_llm, model_llm, api_key_llm are required" }, { status: 400 });
    }
    payload.update_at = new Date().toISOString();
    const admin = supabaseAdmin();
    const { data, error } = await admin.from("mastra_users").update(payload).eq("id", sub).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // refresh cache
    try {
      const cacheKey = `profile:${sub}`;
      await redisSetJSON(cacheKey, data, 600);
    } catch {}
    return NextResponse.json({ profile: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 400 });
  }
}

// Allow POST as alias of PATCH for clients without PATCH helper
export async function POST(req: Request) {
  return PATCH(req);
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }


