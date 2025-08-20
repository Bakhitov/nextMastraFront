const hasChrome = typeof chrome !== "undefined" && !!chrome?.storage?.local;

export const storage = {
  hasChrome,
  async get<T = any>(key: string): Promise<T | null> {
    if (hasChrome) {
      const obj = await chrome.storage.local.get(key);
      return (obj as any)[key] ?? null;
    }
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  async getMany(keys: string[]): Promise<Record<string, any>> {
    if (hasChrome) {
      return chrome.storage.local.get(keys);
    }
    const out: Record<string, any> = {};
    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        out[k] = v ? JSON.parse(v) : null;
      } catch {
        out[k] = null;
      }
    }
    return out;
  },
  async setItems(obj: Record<string, any>): Promise<void> {
    if (hasChrome) {
      await chrome.storage.local.set(obj);
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      localStorage.setItem(k, JSON.stringify(v));
    }
  },
  async clear(): Promise<void> {
    if (hasChrome) {
      await chrome.storage.local.clear();
      return;
    }
    localStorage.clear();
  },
};


