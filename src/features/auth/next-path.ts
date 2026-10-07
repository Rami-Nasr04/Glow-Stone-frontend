// Any origin that can't be a real one: a destination is kept only if it resolves to this same origin.
const HERE = "https://glowstone.invalid"

// Where to go after signing in. Parsed the way a browser parses it (tabs and newlines dropped, "\" read as "/"),
// so "//evil.com", "/\evil.com" and "/<tab>/evil.com" all count as other sites and fall back.
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw?.startsWith("/")) return fallback
  try {
    const url = new URL(raw, HERE)
    return url.origin === HERE ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}
