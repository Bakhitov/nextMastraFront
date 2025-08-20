import { MastraClient } from "@mastra/client-js";

const baseUrl = process.env.MASTRA_BASE_URL || "http://localhost:4111";

export const mastraClient = new MastraClient({
  baseUrl,
});


