export type LlmProvider = {
  title: string;          // Display name
  id: string;             // Provider String (stored in provider_llm)
  envVar?: string;        // Suggested env var name
  models: string[];       // Available models
};

export const LLM_PROVIDERS: LlmProvider[] = [
  {
    title: "xAI (Grok)",
    id: "xai",
    envVar: "XAI_API_KEY",
    models: [
      "grok-3",
      "grok-3-fast",
      "grok-3-mini",
      "grok-3-mini-fast",
      "grok-2-1212",
      "grok-2-vision-1212",
      "grok-beta",
      "grok-vision-beta",
    ],
  },
  {
    title: "Vercel AI",
    id: "vercel",
    envVar: "VERCEL_API_KEY",
    models: ["v0-1.0-md"],
  },
  {
    title: "OpenAI",
    id: "openai",
    envVar: "OPENAI_API_KEY",
    models: [
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "o3-mini",
      "o3",
      "o4-mini",
      "o1",
      "o1-mini",
      "o1-preview",
    ],
  },
  {
    title: "Anthropic (Claude)",
    id: "anthropic",
    envVar: "ANTHROPIC_API_KEY",
    models: [
      "claude-4-opus-20250514",
      "claude-4-sonnet-20250514",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620",
      "claude-3-5-haiku-20241022",
    ],
  },
  {
    title: "Mistral AI",
    id: "mistral",
    envVar: "MISTRAL_API_KEY",
    models: [
      "pixtral-large-latest",
      "mistral-large-latest",
      "mistral-small-latest",
      "pixtral-12b-2409",
    ],
  },
  {
    title: "Google Generative AI",
    id: "google",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    models: [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ],
  },
  {
    title: "Google Vertex AI",
    id: "google",
    envVar: "GOOGLE_VERTEX_API_KEY",
    models: [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ],
  },
  {
    title: "DeepSeek AI",
    id: "deepseek",
    envVar: "DEEPSEEK_API_KEY",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    title: "Cerebras (Llama host)",
    id: "cerebras",
    envVar: "CEREBRAS_API_KEY",
    models: ["llama3.1-8b", "llama3.1-70b", "llama3.3-70b"],
  },
  {
    title: "Groq (LPU)",
    id: "groq",
    envVar: "GROQ_API_KEY",
    models: [
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
  },
];

export function getModelsByProviderId(providerId: string): string[] {
  if (!providerId) return [];
  const lower = providerId.toLowerCase();
  const all = LLM_PROVIDERS.filter((p) => p.id.toLowerCase() === lower);
  // merge and dedupe
  const set = new Set<string>();
  for (const p of all) {
    for (const m of p.models) set.add(m);
  }
  return Array.from(set);
}


