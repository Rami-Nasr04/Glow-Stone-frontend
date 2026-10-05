import type { Config } from "@react-router/dev/config"
import { prerenderPaths } from "./src/i18n/paths.ts"

export default {
  appDirectory: "src",
  ssr: false,
  prerender: prerenderPaths,
} satisfies Config
