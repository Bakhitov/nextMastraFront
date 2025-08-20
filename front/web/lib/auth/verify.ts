import { createClient } from "@supabase/supabase-js";
import { getRedis } from "../redis/client";

export type JwtPayload = { sub?: string; email?: string; role?: string };

export async function verifyRequest(req: Request): Promise<JwtPayload> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("Unauthorized");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) throw new Error("Supabase env missing");
  const supabase = createClient(base, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized");
  let role: string | undefined;
  try {
    const { data: profile } = await supabase.from("mastra_users").select("role").eq("id", data.user.id).maybeSingle();
    role = (profile as any)?.role as string | undefined;
  } catch {}
  return { sub: data.user.id, email: data.user.email ?? undefined, role };
}

// Redis rate limiter (fixed window)
const redis = getRedis();

export async function rateLimitFreeOrThrow(userId: string, limit = 20, windowSec = 60) {
  if (!redis) return; // no redis configured → skip
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSec);
  const key = `rl:${userId}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }
  if (count > limit) {
    const ttl = await redis.ttl(key);
    const err: any = new Error("Rate limit exceeded");
    err.status = 429;
    err.retryAfter = ttl > 0 ? ttl : windowSec;
    throw err;
  }
}


