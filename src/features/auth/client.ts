import { createMockAuth } from "./mock-auth"
import type { AuthClient } from "./types"

// The only file that changes when the customer pool is live (F3-live): the Cognito client replaces the demo.
export const authClient: AuthClient = createMockAuth()
