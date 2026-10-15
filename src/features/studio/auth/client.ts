import { requireApiUrl } from "@/features/catalog/api"
import { requireClientId, requirePoolId } from "@/lib/env"
import { createCognitoAdminAuth } from "./cognito"

// The admin pool and the studio's app client (VITE_ADMIN_*; the build stops without them).
export const adminAuthClient = createCognitoAdminAuth({
  userPoolId: requirePoolId("VITE_ADMIN_USER_POOL_ID", import.meta.env.VITE_ADMIN_USER_POOL_ID),
  clientId: requireClientId("VITE_ADMIN_APP_CLIENT_ID", import.meta.env.VITE_ADMIN_APP_CLIENT_ID),
})

export const adminApiBase = requireApiUrl(import.meta.env.VITE_API_URL)
