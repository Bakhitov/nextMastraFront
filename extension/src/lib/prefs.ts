import { storage } from "./storage";

export type AgentPrefs = {
  model_llm: string;
  api_key_llm: string;
  provider_llm: string;
  api_key_by_type: string;
  url_by_type: string;
  role: string;
  is_active: boolean;
  type_agent: string;
};

export const PREF_KEYS = {
  model_llm: "model_llm",
  api_key_llm: "api_key_llm",
  provider_llm: "provider_llm",
  api_key_by_type: "api_key_by_type",
  url_by_type: "url_by_type",
  role: "role",
  is_active: "is_active",
  type_agent: "type_agent",
} as const;

export async function getAgentPrefs(): Promise<AgentPrefs> {
  const keys = Object.values(PREF_KEYS);
  const raw = await storage.getMany(keys);
  return {
    model_llm: raw[PREF_KEYS.model_llm] ?? "",
    api_key_llm: raw[PREF_KEYS.api_key_llm] ?? "",
    provider_llm: raw[PREF_KEYS.provider_llm] ?? "",
    api_key_by_type: raw[PREF_KEYS.api_key_by_type] ?? "",
    url_by_type: raw[PREF_KEYS.url_by_type] ?? "",
    role: raw[PREF_KEYS.role] ?? "",
    is_active: Boolean(raw[PREF_KEYS.is_active] ?? false),
    type_agent: raw[PREF_KEYS.type_agent] ?? "",
  };
}

export async function setAgentPrefs(values: Partial<AgentPrefs>): Promise<void> {
  const toSave: Record<string, any> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) continue;
    // boolean хранить как boolean
    if (k === PREF_KEYS.is_active || k === "is_active") {
      toSave[PREF_KEYS.is_active] = Boolean(v);
    } else {
      toSave[k] = v;
    }
  }
  if (Object.keys(toSave).length > 0) {
    await storage.setItems(toSave);
  }
}

export async function clearAgentPrefs(): Promise<void> {
  const blank: Record<string, any> = {};
  for (const key of Object.values(PREF_KEYS)) {
    blank[key] = null;
  }
  await storage.setItems(blank);
}


