import { createContext, useContext } from "react"
import type { AdminApi } from "../admin-api"
import type { SignInResult } from "./types"

export type AdminStatus = "loading" | "signedIn" | "signedOut"

export interface AdminAuthValue {
  status: AdminStatus
  /** The signed-in admin's email. */
  email: string | null
  /** True once the API refused the session, until the next sign-in. */
  sessionEnded: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  completeNewPassword: (password: string) => Promise<void>
  startPasswordReset: (email: string) => Promise<void>
  finishPasswordReset: (email: string, code: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** The admin products API, with this session's token; a 401 ends the session. */
  api: AdminApi
}

// The studio's own context: the shop's customer session (features/auth) never reads or writes it.
export const AdminAuthContext = createContext<AdminAuthValue | null>(null)

export function useAdminAuth(): AdminAuthValue {
  const value = useContext(AdminAuthContext)
  if (!value) throw new Error("useAdminAuth must be used inside <AdminAuthProvider>")
  return value
}
