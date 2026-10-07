import { useCallback, useEffect, useMemo, useState } from "react"
import { AuthContext, type AuthStatus } from "./auth-context"
import { authClient } from "./client"
import type { AuthClient, AuthUser } from "./types"

interface AuthProviderProps {
  client?: AuthClient
  children: React.ReactNode
}

export default function AuthProvider({ client = authClient, children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")

  // The saved session is read in the browser only; prerendered HTML is always "loading".
  useEffect(() => {
    let live = true
    client.currentUser().then(
      (found) => {
        if (!live) return
        setUser(found)
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

  const signIn = useCallback(
    async (email: string, password: string) => {
      const signedIn = await client.signIn(email, password)
      setUser(signedIn)
      setStatus("signedIn")
      return signedIn
    },
    [client],
  )

  const signOut = useCallback(async () => {
    await client.signOut()
    setUser(null)
    setStatus("signedOut")
  }, [client])

  const value = useMemo(
    () => ({ status, user, isAuthenticated: status === "signedIn", isLoading: status === "loading", client, signIn, signOut }),
    [status, user, client, signIn, signOut],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
