import { NextResponse } from "next/server";
import { mastraClient } from "../../../../lib/mastra/mastra-client";
import { verifyRequest } from "../../../../lib/auth/verify";

async function verify(req: Request) { await verifyRequest(req); }

export async function GET(req: Request) {
  try {
    await verify(req);
    const url = new URL(req.url);
    const resourceId = url.searchParams.get("resourceId") || undefined;
    const agentId = url.searchParams.get("agentId") || undefined;
    if (!resourceId || !agentId) {
      return NextResponse.json({ error: "resourceId and agentId required" }, { status: 400 });
    }
    const base = process.env.MASTRA_BASE_URL || "http://localhost:4111";
    console.log("[/api/v1/threads][GET] base=", base, "resourceId=", resourceId, "agentId=", agentId);
    const list = await mastraClient.getMemoryThreads({ resourceId, agentId });
    return NextResponse.json(list);
  } catch (e: any) {
    console.error("[/api/v1/threads][GET] error:", e);
    const msg = e?.message || "Failed to list threads";
    const code = msg.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function POST(req: Request) {
  try {
    await verify(req);
    const body = await req.json();
    const { title, metadata, resourceId, agentId } = body || {};
    if (!resourceId || !agentId) {
      return NextResponse.json({ error: "resourceId and agentId required" }, { status: 400 });
    }
    const base = process.env.MASTRA_BASE_URL || "http://localhost:4111";
    console.log("[/api/v1/threads][POST] base=", base, "resourceId=", resourceId, "agentId=", agentId, "title=", title);
    const created = await mastraClient.createMemoryThread({ title, metadata: metadata || {}, resourceId, agentId });
    return NextResponse.json(created);
  } catch (e: any) {
    console.error("[/api/v1/threads][POST] error:", e);
    const msg = e?.message || "Failed to create thread";
    const code = msg.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }


