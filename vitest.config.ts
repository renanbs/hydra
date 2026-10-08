import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Frontend parity guard: renders the sidebar surfaces copied from Orca and
// asserts the STRUCTURE Orca produces (dot, identity line, action set). `tsc`
// proves a component compiles; only a render proves it looks like Orca.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // `src/components/pet/pet-models.ts` imports `resources/*.webp?url` at a path that
    // does not exist in this repo (Orca tree depth, zero vendored images). The live store
    // now composes the UI slice, so every store import reaches that module; the three
    // missing images are aliased to an empty URL so the real ids/labels still load.
    // Remove these three entries once the assets are vendored.
    alias: [
      {
        find: "../../../../../resources/claude.webp?url",
        replacement: fileURLToPath(new URL("./src/lib/asset-url-placeholder.ts", import.meta.url)),
      },
      {
        find: "../../../../../resources/opencode.webp?url",
        replacement: fileURLToPath(new URL("./src/lib/asset-url-placeholder.ts", import.meta.url)),
      },
      {
        find: "../../../../../resources/gremlin.webp?url",
        replacement: fileURLToPath(new URL("./src/lib/asset-url-placeholder.ts", import.meta.url)),
      },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.parity.test.tsx", "src/**/*.parity.test.ts"],
  },
});
