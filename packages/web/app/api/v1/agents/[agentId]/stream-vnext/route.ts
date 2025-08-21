import { NextResponse } from "next/server";
import { verifyRequest, rateLimitFreeOrThrow } from "../../../../../../lib/auth/verify";
import { supabaseAdmin } from "../../../../../../lib/supabase/admin";
import { MastraClient } from "@mastra/client-js";

async function verify(req: Request) { return verifyRequest(req); }

// vNext stream proxy with SSE headers passthrough
export async function POST(req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const payload = await verify(req);
    if ((payload as any)?.role === 'free') {
      await rateLimitFreeOrThrow(payload.sub as string);
    }
    const { agentId } = await params;
    const body = await req.json();
    const messages = body?.messages;
    const incomingMemory = body?.memory as { thread?: any; resource?: string; options?: any } | undefined;
    const threadId = (typeof incomingMemory?.thread === "string" ? incomingMemory?.thread : body?.threadId) as string | undefined;
    const resourceId = (incomingMemory?.resource as string | undefined) ?? (body?.resourceId as string | undefined) ?? (payload?.sub as string | undefined);
    if (!threadId || !resourceId) {
      return NextResponse.json({ error: "memory.resource and memory.thread required" }, { status: 400 });
    }
    const memory = { thread: incomingMemory?.thread ?? threadId, resource: incomingMemory?.resource ?? resourceId, options: incomingMemory?.options };

    const baseUrl = process.env.MASTRA_BASE_URL || "http://localhost:4111";
    // runtimeContext из профиля пользователя для динамичных настроек
    const { redisGetJSON, redisSetJSON } = await import("../../../../../../lib/redis/client");
    const cacheKey = `profile:${resourceId}`;
    let profile = await redisGetJSON<any>(cacheKey);
    if (!profile) {
      const admin = supabaseAdmin();
      const { data } = await admin.from("mastra_users").select("provider_llm,model_llm,api_key_llm,api_key_by_type,url_by_type,role").eq("id", resourceId).maybeSingle();
      profile = data;
      if (profile) await redisSetJSON(cacheKey, profile, 600);
    }
    const client = new MastraClient({
      baseUrl,
      headers: {
        // Internal secret to restrict access to Mastra server
        ...(process.env.MASTRA_INTERNAL_SECRET ? { 'x-internal-secret': process.env.MASTRA_INTERNAL_SECRET } : {}),
        "x-provider-llm": (profile as any)?.provider_llm || "",
        "x-api-key-llm": (profile as any)?.api_key_llm || "",
        "x-model-llm": (profile as any)?.model_llm || "",
        "x-role": (profile as any)?.role || "",
        "x-n8n-url": (profile as any)?.url_by_type || "",
        "x-n8n-key": (profile as any)?.api_key_by_type || "",
      },
    });
    const agent = client.getAgent(agentId);
    const upstream = (agent as any).streamVNext
      ? await (agent as any).streamVNext({ messages, memory, savePerStep: true })
      : await agent.stream({ messages, memory, savePerStep: true });

    const headers = new Headers(upstream.headers);
    if (!headers.get("content-type")) headers.set("content-type", "text/event-stream");
    headers.set("cache-control", "no-cache, no-transform");
    headers.set("connection", "keep-alive");
    headers.set("x-accel-buffering", "no");
    headers.set("keep-alive", "timeout=120, max=1000");
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e: any) {
    const status = e?.status === 429 ? 429 : 400;
    const headers: Record<string, string> = {};
    if (status === 429) {
      const retry = typeof e?.retryAfter === 'number' ? e.retryAfter : undefined;
      if (retry) headers['Retry-After'] = String(retry);
    }
    return new NextResponse(JSON.stringify({ error: e?.message || "Stream vNext failed" }), { status, headers });
  }
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }


