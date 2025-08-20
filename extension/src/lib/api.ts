import { createApiClient } from "@nextmastra/shared";
import { storage } from "./storage";

const BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL || "http://localhost:3000";

export const api = createApiClient({
  baseUrl: BASE_URL,
  getToken: async () => {
    const supabaseToken = await storage.get<string>("sb-access-token");
    const accessToken = await storage.get<string>("accessToken");
    return supabaseToken ?? accessToken ?? null;
  },
  timeoutMs: 10000,
  retries: 2,
});

export type UserProfile = {
  id?: string;
  email?: string;
  provider_llm?: string;
  model_llm?: string;
  api_key_llm?: string;
  api_key_by_type?: string;
  url_by_type?: string;
  role?: string;
  is_active?: boolean;
  type_agent?: string;
};

export async function fetchMyProfile(): Promise<UserProfile | null> {
  try {
    const res = await api.get("/api/v1/users/me");
    return (res?.profile as UserProfile) || null;
  } catch {
    return null;
  }
}

export async function updateMyProfile(p: Required<Pick<UserProfile, "provider_llm" | "model_llm" | "api_key_llm">> & Partial<UserProfile>): Promise<UserProfile | null> {
  const res = await api.post("/api/v1/users/me", p as any);
  return (res?.profile as UserProfile) || null;
}


