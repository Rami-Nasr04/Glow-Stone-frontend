import { createContext, useContext } from "react"
import type { AuthClient, AuthUser } from "./types"

export type AuthStatus = "loading" | "signedIn" | "signedOut"

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  /** For the flows that don't change who is signed in (sign up, verify, reset). */
  client: AuthClient
  signIn: (email: string, password: string) => Promise<AuthUser>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>")
  return value
}
