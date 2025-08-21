export type ApiClientConfig = {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  timeoutMs?: number;
  retries?: number;
};

class HttpError extends Error {
  status: number;
  bodyText?: string;
  constructor(message: string, status: number, bodyText?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

export function createApiClient(config: ApiClientConfig) {
  const timeoutMs = typeof config.timeoutMs === "number" ? config.timeoutMs : 15000;
  const maxRetries = typeof config.retries === "number" ? config.retries : 2;

  async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
    const token = await config.getToken();
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let attempt = 0;
    while (true) {
      attempt += 1;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${config.baseUrl}${path}`, { ...init, headers, signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) {
          const isRetriable = res.status >= 500 && res.status <= 599;
          if (isRetriable && attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, 250 * attempt));
            continue;
          }
          const txt = await res.text();
          throw new HttpError(txt || `HTTP ${res.status}`, res.status, txt);
        }
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) return (await res.json()) as T;
        return (await res.text()) as any as T;
      } catch (err: any) {
        clearTimeout(id);
        const isAbort = err?.name === "AbortError";
        const isNetwork = !err?.status && !err?.response;
        if ((isAbort || isNetwork) && attempt <= maxRetries) {
          await new Promise((r) => setTimeout(r, 250 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  return {
    get: <T = any>(path: string) => request<T>(path),
    post: <T = any>(path: string, body?: any) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
    del: <T = any>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}


