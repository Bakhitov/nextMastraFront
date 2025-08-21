import { NextResponse } from "next/server";
import { mastraClient } from "../../../../../../lib/mastra/mastra-client";
import { verifyRequest, rateLimitFreeOrThrow } from "../../../../../../lib/auth/verify";
import { supabaseAdmin } from "../../../../../../lib/supabase/admin";

async function verify(req: Request) { return verifyRequest(req); }

export async function POST(req: Request, { params }: any) {
  try {
    const payload = await verify(req);
    if ((payload as any)?.role === 'free') {
      await rateLimitFreeOrThrow(payload.sub as string);
    }
    const { agentId } = params;
    const body = await req.json();
    const { messages, threadId } = body || {};
    const resourceId = (body?.resourceId as string | undefined) ?? (payload?.sub as string | undefined);
    if (!resourceId || !threadId) {
      return NextResponse.json({ error: "resourceId and threadId required" }, { status: 400 });
    }
    // runtimeContext из профиля пользователя
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
    const stream = await agent.stream({
      messages,
      threadId,
      resourceId,
      headers: {
        ...(process.env.MASTRA_INTERNAL_SECRET ? { 'x-internal-secret': process.env.MASTRA_INTERNAL_SECRET } : {}),
        "x-provider-llm": (profile as any)?.provider_llm || "",
        "x-api-key-llm": (profile as any)?.api_key_llm || "",
        "x-model-llm": (profile as any)?.model_llm || "",
        "x-role": (profile as any)?.role || "",
        "x-n8n-url": (profile as any)?.url_by_type || "",
        "x-n8n-key": (profile as any)?.api_key_by_type || "",
      },
    });

    let text = "";
    await stream.processDataStream({
      onTextPart: (chunk) => {
        text += chunk;
      },
    });

    return NextResponse.json({ text });
  } catch (e: any) {
    const status = e?.status === 429 ? 429 : 400;
    const headers: Record<string, string> = {};
    if (status === 429) {
      const retry = typeof e?.retryAfter === 'number' ? e.retryAfter : undefined;
      if (retry) headers['Retry-After'] = String(retry);
    }
    return new NextResponse(JSON.stringify({ error: e?.message || "Respond failed" }), { status, headers });
  }
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }


