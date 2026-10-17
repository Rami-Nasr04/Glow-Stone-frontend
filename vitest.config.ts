import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// The React Router framework plugin is build-only; tests use the plain React plugin.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Half the logical cores: one jsdom worker per thread starves them all, and the studio's longest tests (1.5 s
    // alone) passed the 5 s timeout. Half takes no longer in all and keeps them near 2 s.
    maxWorkers: "50%",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    // Placeholder addresses: no test reaches a real site or API.
    env: {
      VITE_SITE_URL: "https://site.test",
      VITE_ALLOW_INDEXING: "false",
      VITE_API_URL: "https://api.test",
      VITE_ADMIN_USER_POOL_ID: "eu-central-1_Test123",
      VITE_ADMIN_APP_CLIENT_ID: "testclient123",
    },
  },
})
