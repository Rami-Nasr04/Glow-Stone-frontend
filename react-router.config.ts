import { copyFileSync, existsSync, renameSync } from "node:fs"
import { join } from "node:path"
import type { Config } from "@react-router/dev/config"
import { loadEnv } from "vite"
import { readSiteParts, readStudioBase } from "./src/config/studio.ts"
import { customerAuthSetup } from "./src/features/auth/setup.ts"
import { fetchProducts, requireApiUrl } from "./src/features/catalog/api.ts"
import { prerenderPaths } from "./src/i18n/paths.ts"
import { requireClientId, requireFlag, requirePoolId, requireUrl } from "./src/lib/env.ts"

export default {
  appDirectory: "src",
  ssr: false,
  // The product pages come from GET /products. A missing or bad VITE_SITE_URL, VITE_ALLOW_INDEXING, VITE_API_URL,
  // VITE_SITE_PARTS/VITE_STUDIO_BASE, (with the shop) VITE_CUSTOMER_* / VITE_ACCOUNTS_OPEN or (with the studio)
  // VITE_ADMIN_*, or a bad answer, stops the build. A
  // studio-only build prerenders nothing: every address gets the SPA shell.
  async prerender() {
    const env = loadEnv("production", process.cwd(), "VITE_")
    const parts = readSiteParts(env.VITE_SITE_PARTS)
    readStudioBase(env.VITE_STUDIO_BASE, parts)
    requireUrl("VITE_SITE_URL", env.VITE_SITE_URL)
    requireFlag("VITE_ALLOW_INDEXING", env.VITE_ALLOW_INDEXING)
    const api = requireApiUrl(env.VITE_API_URL)
    if (parts.includes("studio")) {
      requirePoolId("VITE_ADMIN_USER_POOL_ID", env.VITE_ADMIN_USER_POOL_ID)
      requireClientId("VITE_ADMIN_APP_CLIENT_ID", env.VITE_ADMIN_APP_CLIENT_ID)
    }
    if (!parts.includes("shop")) return []
    customerAuthSetup({
      dev: false,
      mode: "production",
      poolId: env.VITE_CUSTOMER_USER_POOL_ID,
      clientId: env.VITE_CUSTOMER_APP_CLIENT_ID,
      accountsOpen: env.VITE_ACCOUNTS_OPEN,
    })
    return prerenderPaths(await fetchProducts(api))
  },
  // With nothing prerendered (the studio alone) React Router writes the app shell as index.html. vercel.json rewrites
  // to /__spa-fallback.html, so the shell takes that name and "/" goes through the same rewrite. Every build also gets
  // 404.html, a copy of the shell: Vercel (and npm start) answer an address with no file and no rewrite with it and
  // status 404, and the app shows its 404 page there.
  async buildEnd({ reactRouterConfig }) {
    const env = loadEnv("production", process.cwd(), "VITE_")
    const client = join(reactRouterConfig.buildDirectory, "client")
    const shell = join(client, "__spa-fallback.html")
    if (!readSiteParts(env.VITE_SITE_PARTS).includes("shop") && existsSync(join(client, "index.html"))) renameSync(join(client, "index.html"), shell)
    if (existsSync(shell)) copyFileSync(shell, join(client, "404.html"))
  },
} satisfies Config
