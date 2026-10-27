import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Frontend parity guard: renders the sidebar surfaces copied from Orca and
// asserts the STRUCTURE Orca produces (dot, identity line, action set). `tsc`
// proves a component compiles; only a render proves it looks like Orca.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.parity.test.tsx", "src/**/*.parity.test.ts"],
  },
});
