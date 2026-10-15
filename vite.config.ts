import { fileURLToPath } from "node:url"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  // amazon-cognito-identity-js (the studio's sign-in) reads Node's `global`, which browsers call globalThis.
  define: { global: "globalThis" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
