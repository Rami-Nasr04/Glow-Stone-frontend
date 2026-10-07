import { createMockAuth } from "./mock-auth"
import type { AuthClient } from "./types"

// The only file that changes when the customer pool is live (F3-live): the Cognito client replaces the demo.
export const authClient: AuthClient = createMockAuth()

// The account icon and menu link show once the real customer pool is live (Rami, 2026-10-07: hidden on the
// Milestone 1 link). `npm run dev` shows them so the demo pages can be reached; built sites hide them.
export const ACCOUNTS_OPEN = authClient.mode === "live" || import.meta.env.DEV
