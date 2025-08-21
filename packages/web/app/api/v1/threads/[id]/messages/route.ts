import { NextResponse } from "next/server";
import { mastraClient } from "../../../../../../lib/mastra/mastra-client";
import { verifyRequest } from "../../../../../../lib/auth/verify";

async function verify(req: Request) { await verifyRequest(req); }

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verify(req);
    const { id } = await params;
    const thread = mastraClient.getMemoryThread(id, "n8nAgent");
    // vNext-совместимый ответ: отдаём uiMessages, чтобы корректно построить tool-call/result над ассистентом
    const res = await thread.getMessages();
    const messages = Array.isArray((res as any)?.uiMessages) ? (res as any).uiMessages : (res as any)?.messages;
    return NextResponse.json({ messages });
  } catch (e: any) {
    const msg = e?.message || "Failed";
    const code = msg.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }


