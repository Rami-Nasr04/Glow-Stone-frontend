import { requireApiUrl } from "@/features/catalog/api"
import { requireClientId, requirePoolId } from "@/lib/env"
import { createStudioDemoFetch, studioDemoOn } from "../demo-orders"
import { createCognitoAdminAuth } from "./cognito"

// The admin pool and the studio's app client (VITE_ADMIN_*; the build stops without them).
export const adminAuthClient = createCognitoAdminAuth({
  userPoolId: requirePoolId("VITE_ADMIN_USER_POOL_ID", import.meta.env.VITE_ADMIN_USER_POOL_ID),
  clientId: requireClientId("VITE_ADMIN_APP_CLIENT_ID", import.meta.env.VITE_ADMIN_APP_CLIENT_ID),
})

export const adminApiBase = requireApiUrl(import.meta.env.VITE_API_URL)

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

/** True on `npm run dev:demo`: the orders and customers are made up and answered in this browser. */
export const studioDemo = studioDemoOn({ dev: import.meta.env.DEV, mode: import.meta.env.MODE })

// The network, or on `npm run dev:demo` the demo for the orders and customers routes (the rest still goes out).
export const adminFetch: typeof fetch | undefined = studioDemo
  ? createStudioDemoFetch({ storage: browserStorage(), real: (input, init) => fetch(input, init) })
  : undefined
