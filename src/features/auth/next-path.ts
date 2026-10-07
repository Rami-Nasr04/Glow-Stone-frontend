// Where to go after signing in. Only paths on this site: "//evil.com" and "/\evil.com" are other sites to a browser.
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback
  return raw
}
