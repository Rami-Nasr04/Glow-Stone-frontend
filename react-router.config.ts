import type { Config } from "@react-router/dev/config"
import { loadEnv } from "vite"
import { fetchProducts, requireApiUrl } from "./src/features/catalog/api.ts"
import { prerenderPaths } from "./src/i18n/paths.ts"
import { requireClientId, requireFlag, requirePoolId, requireUrl } from "./src/lib/env.ts"

export default {
  appDirectory: "src",
  ssr: false,
  // The product pages come from GET /products. A missing or bad VITE_SITE_URL, VITE_ALLOW_INDEXING, VITE_ADMIN_* or
  // VITE_API_URL, or a bad answer, stops the build.
  async prerender() {
    const env = loadEnv("production", process.cwd(), "VITE_")
    requireUrl("VITE_SITE_URL", env.VITE_SITE_URL)
    requireFlag("VITE_ALLOW_INDEXING", env.VITE_ALLOW_INDEXING)
    requirePoolId("VITE_ADMIN_USER_POOL_ID", env.VITE_ADMIN_USER_POOL_ID)
    requireClientId("VITE_ADMIN_APP_CLIENT_ID", env.VITE_ADMIN_APP_CLIENT_ID)
    return prerenderPaths(await fetchProducts(requireApiUrl(env.VITE_API_URL)))
  },
} satisfies Config
