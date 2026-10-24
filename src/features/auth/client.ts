import { createMockAuth } from "./mock-auth"
import { customerAuthSetup, type CustomerPool } from "./setup"
import { AuthError, type AuthClient } from "./types"

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

// The Cognito client, downloaded the first time something needs it. A visitor who has never signed in on this browser
// has no session saved under the shop's app client, so their pages answer "nobody" without the library.
export function lazyCognitoAuth(pool: CustomerPool, storage: Storage | null = browserStorage()): AuthClient {
  let loading: Promise<AuthClient> | null = null
  const load = () => {
    loading ??= import("./cognito").then(
      ({ createCognitoAuth }) => createCognitoAuth(pool),
      () => {
        loading = null
        throw new AuthError("network")
      },
    )
    return loading
  }
  const hasSession = () => {
    try {
      return Boolean(storage?.getItem(`CognitoIdentityServiceProvider.${pool.clientId}.LastAuthUser`))
    } catch {
      return false
    }
  }

  return {
    mode: "live",
    currentUser: async () => (hasSession() ? (await load()).currentUser() : null),
    signIn: async (email, password) => (await load()).signIn(email, password),
    signUp: async (input) => (await load()).signUp(input),
    confirmSignUp: async (email, code) => (await load()).confirmSignUp(email, code),
    resendCode: async (email) => (await load()).resendCode(email),
    forgotPassword: async (email) => (await load()).forgotPassword(email),
    confirmForgotPassword: async (email, code, password) => (await load()).confirmForgotPassword(email, code, password),
    signOut: async () => (await load()).signOut(),
    accessToken: async () => (await load()).accessToken(),
  }
}

const setup = customerAuthSetup({
  dev: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  poolId: import.meta.env.VITE_CUSTOMER_USER_POOL_ID,
  clientId: import.meta.env.VITE_CUSTOMER_APP_CLIENT_ID,
  accountsOpen: import.meta.env.VITE_ACCOUNTS_OPEN,
})

export const authClient: AuthClient = setup.pool ? lazyCognitoAuth(setup.pool) : createMockAuth()

// The account icon, the sign-in pages, checkout and My account. Closed on built sites until VITE_ACCOUNTS_OPEN=true.
export const ACCOUNTS_OPEN = setup.accountsOpen
