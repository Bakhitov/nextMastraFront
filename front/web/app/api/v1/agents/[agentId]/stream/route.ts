import { NextResponse } from "next/server";
import { mastraClient } from "../../../../../../lib/mastra/mastra-client";
import { verifyRequest, rateLimitFreeOrThrow } from "../../../../../../lib/auth/verify";
import { supabaseAdmin } from "../../../../../../lib/supabase/admin";

async function verify(req: Request) { return verifyRequest(req); }

export async function POST(req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const payload = await verify(req);
    if ((payload as any)?.role === 'free') {
      await rateLimitFreeOrThrow(payload.sub as string);
    }
    const { agentId } = await params;
    const body = await req.json();
    const { messages } = body || {};
    const incomingMemory = body?.memory as { thread?: any; resource?: string; options?: any } | undefined;
    // Back-compat fallbacks: prefer memory.thread/resource; fallback to top-level threadId/resourceId or auth subject
    const threadId = (typeof incomingMemory?.thread === "string" ? incomingMemory?.thread : body?.threadId) as string | undefined;
    const resourceId = (incomingMemory?.resource as string | undefined) ?? (body?.resourceId as string | undefined) ?? (payload?.sub as string | undefined);
    type MemoryPayload = { thread: any; resource: string; options?: any };
    let memory: MemoryPayload;
    if (!resourceId || !threadId) {
      return NextResponse.json({ error: "memory.resource and memory.thread required" }, { status: 400 });
    }
    memory = {
      thread: incomingMemory?.thread ?? threadId,
      resource: incomingMemory?.resource ?? resourceId,
      options: incomingMemory?.options,
    };
    // Подтягиваем профиль пользователя для runtimeContext (динамичная конфигурация)
    // cache profile
    const { redisGetJSON, redisSetJSON } = await import("../../../../../../lib/redis/client");
    const cacheKey = `profile:${resourceId}`;
    let profile = await redisGetJSON<any>(cacheKey);
    if (!profile) {
      const admin = supabaseAdmin();
      const { data } = await admin.from("mastra_users").select("provider_llm,model_llm,api_key_llm,api_key_by_type,url_by_type,role").eq("id", resourceId).maybeSingle();
      profile = data;
      if (profile) await redisSetJSON(cacheKey, profile, 600);
    }

    const agent = mastraClient.getAgent(agentId);
    const upstream = await agent.stream({
      messages,
      memory,
      savePerStep: true,
      headers: {
        "x-provider-llm": (profile as any)?.provider_llm || "",
        "x-api-key-llm": (profile as any)?.api_key_llm || "",
        "x-model-llm": (profile as any)?.model_llm || "",
        "x-role": (profile as any)?.role || "",
        "x-n8n-url": (profile as any)?.url_by_type || "",
        "x-n8n-key": (profile as any)?.api_key_by_type || "",
      },
    });
    const headers = new Headers(upstream.headers);
    if (!headers.get("content-type")) headers.set("content-type", "text/event-stream");
    headers.set("cache-control", "no-cache");
    headers.set("connection", "keep-alive");
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e: any) {
    const status = e?.status === 429 ? 429 : 400;
    const headers: Record<string, string> = {};
    if (status === 429) {
      const retry = typeof e?.retryAfter === 'number' ? e.retryAfter : undefined;
      if (retry) headers['Retry-After'] = String(retry);
    }
    return new NextResponse(JSON.stringify({ error: e?.message || "Stream failed" }), { status, headers });
  }
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }


