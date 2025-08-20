import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "path";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    hmr: { clientPort: 5173 },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    sourcemap: true,
  },
});


