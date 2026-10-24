import { fileURLToPath } from "node:url"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  // amazon-cognito-identity-js (the studio's and the customers' sign-in) reads Node's `global`, which browsers call
  // globalThis.
  define: { global: "globalThis" },
  // The shop loads it only when someone signs in, so the dev server would find it then and reload the page mid-form.
  optimizeDeps: { include: ["amazon-cognito-identity-js"] },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
