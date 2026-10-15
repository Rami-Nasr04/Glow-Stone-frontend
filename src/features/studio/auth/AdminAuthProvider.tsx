import { useCallback, useEffect, useMemo, useState } from "react"
import { createAdminApi } from "../admin-api"
import { clearAllDrafts, stashOpenDrafts } from "../drafts"
import { AdminAuthContext, type AdminStatus } from "./admin-auth-context"
import { adminAuthClient, adminApiBase } from "./client"
import type { AdminAuthClient } from "./types"

interface AdminAuthProviderProps {
  client?: AdminAuthClient
  /** The API's base address (VITE_API_URL). */
  apiBase?: string
  children: React.ReactNode
}

export default function AdminAuthProvider({ client = adminAuthClient, apiBase = adminApiBase, children }: AdminAuthProviderProps) {
  const [status, setStatus] = useState<AdminStatus>("loading")
  const [email, setEmail] = useState<string | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)

  // The saved session is read in the browser only.
  useEffect(() => {
    let live = true
    client.currentAdmin().then(
      (found) => {
        if (!live) return
        setEmail(found)
        setStatus(found ? "signedIn" : "signedOut")
      },
      () => {
        if (live) setStatus("signedOut")
      },
    )
    return () => {
      live = false
    }
  }, [client])

  const signedIn = useCallback((address: string) => {
    setEmail(address)
    setStatus("signedIn")
    setSessionEnded(false)
  }, [])

  // Any 401: keep the open forms' unsaved changes, clear the session here, and let RequireAdmin send the admin to
  // sign in (Rami's rule: judged by the status, no retry, since the token is refreshed before every call).
  const endSession = useCallback(() => {
    stashOpenDrafts()
    client.clearSession()
    setEmail(null)
    setStatus("signedOut")
    setSessionEnded(true)
  }, [client])

  const api = useMemo(
    () => createAdminApi({ baseUrl: apiBase, accessToken: () => client.accessToken(), onUnauthorized: endSession }),
    [apiBase, client, endSession],
  )

  const signIn = useCallback(
    async (address: string, password: string) => {
      const result = await client.signIn(address, password)
      if (result.status === "signedIn") signedIn(result.email)
      return result
    },
    [client, signedIn],
  )

  const completeNewPassword = useCallback(async (password: string) => signedIn(await client.completeNewPassword(password)), [client, signedIn])

  const startPasswordReset = useCallback((address: string) => client.startPasswordReset(address), [client])

  const finishPasswordReset = useCallback(
    async (address: string, code: string, password: string) => signedIn(await client.finishPasswordReset(address, code, password)),
    [client, signedIn],
  )

  const signOut = useCallback(async () => {
    clearAllDrafts()
    await client.signOut()
    setEmail(null)
    setStatus("signedOut")
    setSessionEnded(false)
  }, [client])

  const value = useMemo(
    () => ({ status, email, sessionEnded, signIn, completeNewPassword, startPasswordReset, finishPasswordReset, signOut, api }),
    [status, email, sessionEnded, signIn, completeNewPassword, startPasswordReset, finishPasswordReset, signOut, api],
  )
  return <AdminAuthContext value={value}>{children}</AdminAuthContext>
}
