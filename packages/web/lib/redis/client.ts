import Redis from "ioredis";

let client: Redis | undefined;

export function getRedis(): Redis | undefined {
  if (!client && process.env.REDIS_URL) {
    client = new Redis(process.env.REDIS_URL);
  }
  return client;
}

export async function redisGetJSON<T = any>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  const raw = await r.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function redisSetJSON(key: string, value: any, ttlSec?: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const v = JSON.stringify(value);
  if (ttlSec && ttlSec > 0) {
    await r.set(key, v, "EX", ttlSec);
  } else {
    await r.set(key, v);
  }
}


