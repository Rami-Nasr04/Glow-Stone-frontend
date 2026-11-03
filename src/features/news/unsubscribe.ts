import { apiBase } from "@/features/catalog/catalog"
import { localDemo } from "@/lib/local-demo"

export type UnsubscribeResult = { ok: true } | { ok: false; reason: "invalid"; message?: string } | { ok: false; reason: "failed" }

// POST /subscribers/unsubscribe?t=<token>: no body, no headers of our own, so the browser sends it as a simple CORS
// request. A valid link always answers 204, even when the person had already left. Never throws, never keeps the token.
export async function unsubscribe(token: string): Promise<UnsubscribeResult> {
  // On `npm run dev:demo` the list is never reached: any link works, except one whose token starts with "invalid".
  if (import.meta.env.DEV && localDemo()) return token.startsWith("invalid") ? { ok: false, reason: "invalid" } : { ok: true }
  try {
    const response = await fetch(`${apiBase()}/subscribers/unsubscribe?t=${encodeURIComponent(token)}`, { method: "POST" })
    if (response.status === 204 || response.ok) return { ok: true }
    if (response.status === 400) {
      const message = await response.json().then(
        (body: { error?: { message?: unknown } }) => body?.error?.message,
        () => undefined,
      )
      return typeof message === "string" && message ? { ok: false, reason: "invalid", message } : { ok: false, reason: "invalid" }
    }
    return { ok: false, reason: "failed" }
  } catch {
    return { ok: false, reason: "failed" }
  }
}
