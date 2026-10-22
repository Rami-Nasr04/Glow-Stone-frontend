import { apiBase } from "@/features/catalog/catalog"

export interface SubscribeRequest {
  email: string
  /** True where the visitor asked for news (footer, notify me): it undoes an earlier unsubscribe. */
  rejoin: boolean
  /** The spam-trap field's value: empty for every real visitor. */
  website: string
}

export type SubscribeResult = { ok: true } | { ok: false; reason: "invalid"; message?: string } | { ok: false; reason: "busy" | "failed" }

interface SubscribeOptions {
  timeoutMs?: number
}

// POST /subscribers, the news list. Never throws: every outcome is a result, so a quiet caller can ignore it.
// 204 never says whether the email was new, already there, or a bot's (that's on purpose, server side).
export async function subscribe(request: SubscribeRequest, { timeoutMs = 15_000 }: SubscribeOptions = {}): Promise<SubscribeResult> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(new Error("timed out")), timeoutMs)
  try {
    const response = await fetch(`${apiBase()}/subscribers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(request),
      signal: abort.signal,
      // Lets the request finish when the visitor's app takes over the page (mailto, or WhatsApp in this tab).
      keepalive: true,
    })
    if (response.ok) return { ok: true }
    if (response.status === 429) return { ok: false, reason: "busy" }
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
  } finally {
    clearTimeout(timer)
  }
}
