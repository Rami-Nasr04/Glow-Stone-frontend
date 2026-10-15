// The studio's address prefix, written here and nowhere else. It is "/studio" on the shop's address until the studio
// moves to its own subdomain, where it becomes "/" (config only, no code change). Node-safe: routes.ts imports it.
import { safeNext } from "../features/auth/next-path.ts"

export const STUDIO_BASE = "/studio"

/** A studio address: studioPath("/products/7") is "/studio/products/7" today. */
export function studioPath(path: string, base: string = STUDIO_BASE): string {
  if (base === "/") return path
  return path === "/" ? base : `${base}${path}`
}

// The sign-in pages never count as a destination after signing in.
const SIGN_IN_PAGES = ["/sign-in", "/forgot-password"]

/** Where to go after signing in: a studio page asked for in ?next=, or the products list. */
export function safeStudioNext(raw: string | null | undefined, base: string = STUDIO_BASE): string {
  const fallback = studioPath("/products", base)
  const next = safeNext(raw, fallback)
  if (next === fallback) return fallback
  const pathname = next.split(/[?#]/)[0]
  const inside = base === "/" ? pathname : pathname === base ? "/" : pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : null
  if (inside === null || SIGN_IN_PAGES.some((page) => inside === page || inside.startsWith(`${page}/`))) return fallback
  return next
}
