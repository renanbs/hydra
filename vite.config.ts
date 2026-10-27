import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // The last three entries stand in for `resources/{claude,opencode,gremlin}.webp`, which
    // `src/components/pet/pet-models.ts` imports at a path that resolves outside this
    // checkout and which was never vendored. The store's UI slice needs that module for its
    // pet ids, so without the alias every store consumer fails to resolve the images.
    // Remove them (and `src/lib/asset-url-placeholder.ts`) once the assets exist.
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: "../../../../../resources/claude.webp?url",
        replacement: path.resolve(__dirname, "./src/lib/asset-url-placeholder.ts"),
      },
      {
        find: "../../../../../resources/opencode.webp?url",
        replacement: path.resolve(__dirname, "./src/lib/asset-url-placeholder.ts"),
      },
      {
        find: "../../../../../resources/gremlin.webp?url",
        replacement: path.resolve(__dirname, "./src/lib/asset-url-placeholder.ts"),
      },
    ],
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
});
