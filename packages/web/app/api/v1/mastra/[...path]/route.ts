import { NextResponse } from "next/server";

const MASTRA_BASE = process.env.MASTRA_BASE_URL || "http://localhost:4111";

function buildTargetUrl(pathParts: string[], search: string) {
  const targetPath = pathParts.join("/");
  const url = `${MASTRA_BASE}/${targetPath}${search ? `?${search}` : ""}`;
  return url;
}

function filterHeaders(headers: Headers): HeadersInit {
  const out: Record<string, string> = {};
  for (const [k, v] of headers.entries()) {
    const key = k.toLowerCase();
    if (["host", "connection", "content-length"].includes(key)) continue;
    out[k] = v;
  }
  return out;
}

async function proxy(req: Request, context: any) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const secret = process.env.NEXTAUTH_SECRET || "dev-nextauth-secret";
      const { default: jwt } = await import("jsonwebtoken");
      jwt.verify(token, secret);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const pathParts = (context?.params?.path as string[]) || [];
    const urlObj = new URL(req.url);
    const targetUrl = buildTargetUrl(pathParts, urlObj.searchParams.toString());

    const method = req.method;
    const headers = filterHeaders(req.headers);
    let body: any = undefined;
    if (!(method === "GET" || method === "HEAD")) {
      const contentType = (req.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const json = await req.json();
        body = JSON.stringify(json);
      } else {
        const buf = await req.arrayBuffer();
        body = buf;
      }
    }

    const res = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    const resHeaders: Record<string, string> = {};
    for (const [k, v] of res.headers.entries()) {
      const key = k.toLowerCase();
      if (["transfer-encoding", "content-encoding"].includes(key)) continue;
      resHeaders[k] = v;
    }

    return new NextResponse(res.body as any, {
      status: res.status,
      headers: resHeaders,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Mastra upstream unreachable" }, { status: 502 });
  }
}

export async function GET(req: Request, context: any) { return proxy(req, context); }
export async function POST(req: Request, context: any) { return proxy(req, context); }
export async function PUT(req: Request, context: any) { return proxy(req, context); }
export async function DELETE(req: Request, context: any) { return proxy(req, context); }
export async function PATCH(req: Request, context: any) { return proxy(req, context); }
export async function OPTIONS() { return new Response(null, { status: 204 }); }


