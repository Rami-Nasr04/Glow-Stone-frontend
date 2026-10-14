import type { Config } from "@react-router/dev/config"
import { loadEnv } from "vite"
import { fetchProducts, requireApiUrl } from "./src/features/catalog/api.ts"
import { prerenderPaths } from "./src/i18n/paths.ts"
import { requireUrl } from "./src/lib/env.ts"

export default {
  appDirectory: "src",
  ssr: false,
  // The product pages come from GET /products. A missing VITE_SITE_URL or VITE_API_URL, or a bad answer, stops the build.
  async prerender() {
    const { VITE_API_URL, VITE_SITE_URL } = loadEnv("production", process.cwd(), "VITE_")
    requireUrl("VITE_SITE_URL", VITE_SITE_URL)
    return prerenderPaths(await fetchProducts(requireApiUrl(VITE_API_URL)))
  },
} satisfies Config
