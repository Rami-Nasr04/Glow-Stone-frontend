/// <reference types="vite/client" />
// Which parts of the site a build carries, and the studio's address prefix, written here and nowhere else. The shop's
// project sets VITE_SITE_PARTS=shop (no studio code at all); the studio's project sets VITE_SITE_PARTS=studio with
// VITE_STUDIO_BASE=/ (the studio at the root of studio.glowstonelb.com, nothing prerendered). Unset (local
// development), a build carries both, with the studio under "/studio". Node-safe: the route list,
// the build config and scripts/check-pages.ts import it.
import { safeNext } from "../features/auth/next-path.ts"

export type SitePart = "shop" | "studio"

/** VITE_SITE_PARTS: unset for both, or exactly "shop" or "studio". */
export function readSiteParts(value: string | undefined): SitePart[] {
  const part = value?.trim()
  if (!part) return ["shop", "studio"]
  if (part === "shop" || part === "studio") return [part]
  throw new Error('VITE_SITE_PARTS must be "shop" or "studio", or unset for both.')
}

/** VITE_STUDIO_BASE: unset for "/studio"; "/" exactly when the build carries the studio alone. */
export function readStudioBase(value: string | undefined, parts: readonly SitePart[]): string {
  const base = value?.trim() || "/studio"
  if (!/^\/([a-z0-9-]+)?$/.test(base)) throw new Error('VITE_STUDIO_BASE must be "/" or one segment such as "/studio".')
  const alone = !parts.includes("shop")
  if (alone && base !== "/") throw new Error("A studio-only build (VITE_SITE_PARTS=studio) is served at the root: set VITE_STUDIO_BASE=/.")
  if (!alone && base === "/") throw new Error("The studio can't take the root while the shop is in the same build.")
  return base
}

// Vite's variables in the app and the route list; the process's own in plain Node (scripts/check-pages.ts). Each
// variable by its full name, which Vite replaces with its value alone: read whole, Vite's env becomes an object of
// every VITE_ variable, and that put the admin ids in the shop's bundle (tests/build-config.test.ts).
const processEnv: Record<string, string | undefined> = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

export const SITE_PARTS = readSiteParts(import.meta.env?.VITE_SITE_PARTS ?? processEnv.VITE_SITE_PARTS)
export const STUDIO_BASE = readStudioBase(import.meta.env?.VITE_STUDIO_BASE ?? processEnv.VITE_STUDIO_BASE, SITE_PARTS)

/** The studio's "View shop" link: the same site, or the shop's own address when this build has no shop. */
export function shopHref(parts: readonly SitePart[], siteUrl: string): string {
  return parts.includes("shop") ? "/" : `${siteUrl}/`
}

/** A studio address: studioPath("/products/7") is "/studio/products/7" today. */
export function studioPath(path: string, base: string = STUDIO_BASE): string {
  if (base === "/") return path
  return path === "/" ? base : `${base}${path}`
}

// The sign-in pages never count as a destination after signing in.
const SIGN_IN_PAGES = ["/sign-in", "/forgot-password"]

/** Where to go after signing in: a studio page asked for in ?next=, or the orders list. */
export function safeStudioNext(raw: string | null | undefined, base: string = STUDIO_BASE): string {
  const fallback = studioPath("/orders", base)
  const next = safeNext(raw, fallback)
  if (next === fallback) return fallback
  const pathname = next.split(/[?#]/)[0]
  const inside = base === "/" ? pathname : pathname === base ? "/" : pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : null
  if (inside === null || SIGN_IN_PAGES.some((page) => inside === page || inside.startsWith(`${page}/`))) return fallback
  return next
}
