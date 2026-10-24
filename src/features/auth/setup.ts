// Which sign-in the shop uses and whether its account pages are open, from the environment. Node-safe: the build
// config checks the same variables before prerendering.
import { requireClientId, requirePoolId } from "../../lib/env.ts"

export interface CustomerAuthEnv {
  dev: boolean
  /** Vite's mode: "test" under Vitest, "demo" for `npm run dev:demo`. */
  mode: string
  poolId: string | undefined
  clientId: string | undefined
  accountsOpen: string | undefined
}

export interface CustomerPool {
  userPoolId: string
  clientId: string
}

export interface CustomerAuthSetup {
  /** The real customer pool, or null for the demo accounts. */
  pool: CustomerPool | null
  accountsOpen: boolean
}

// Which sign-in the shop uses, and whether its account pages are open:
// - the real customer pool when VITE_CUSTOMER_USER_POOL_ID and VITE_CUSTOMER_APP_CLIENT_ID are both set, except under
//   Vitest and `npm run dev:demo`, which always use the demo (accounts in this browser, every code 123456);
// - accounts, checkout and ordering open on the dev server, and on a built site only with VITE_ACCOUNTS_OPEN=true
//   (unset on Vercel until Rami opens them). A built site never opens the demo accounts.
export function customerAuthSetup({ dev, mode, poolId, clientId, accountsOpen }: CustomerAuthEnv): CustomerAuthSetup {
  let pool: CustomerPool | null = null
  if (poolId?.trim() || clientId?.trim()) {
    pool = {
      userPoolId: requirePoolId("VITE_CUSTOMER_USER_POOL_ID", poolId),
      clientId: requireClientId("VITE_CUSTOMER_APP_CLIENT_ID", clientId),
    }
  }
  if (mode === "test" || mode === "demo") pool = null
  const flag = accountsOpen?.trim() ?? ""
  if (flag !== "" && flag !== "true" && flag !== "false") throw new Error('VITE_ACCOUNTS_OPEN must be "true", "false" or unset.')
  if (!dev && flag === "true" && !pool) throw new Error("VITE_ACCOUNTS_OPEN=true needs VITE_CUSTOMER_USER_POOL_ID and VITE_CUSTOMER_APP_CLIENT_ID.")
  return { pool, accountsOpen: dev || flag === "true" }
}
