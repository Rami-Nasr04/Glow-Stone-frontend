import type { Config } from "@react-router/dev/config"
import { loadEnv } from "vite"
import { fetchProducts, requireApiUrl } from "./src/features/catalog/api.ts"
import { prerenderPaths } from "./src/i18n/paths.ts"

export default {
  appDirectory: "src",
  ssr: false,
  // The product pages come from GET /products; a missing VITE_API_URL or a bad answer stops the build.
  async prerender() {
    const { VITE_API_URL } = loadEnv("production", process.cwd(), "VITE_")
    return prerenderPaths(await fetchProducts(requireApiUrl(VITE_API_URL)))
  },
} satisfies Config
