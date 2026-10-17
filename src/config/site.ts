import { type SitePart, SITE_PARTS } from "@/config/studio"
import { requireFlag, requireUrl } from "@/lib/env"

// Public contact channels. These move to the editable settings (GET /settings/public) once the API is live.
export const CONTACT_EMAIL = "glowstone216@gmail.com"

// Absolute origin for canonical links and link previews (VITE_SITE_URL; the build stops without it).
export const SITE_URL = requireUrl("VITE_SITE_URL", import.meta.env.VITE_SITE_URL)

/** Indexing is allowed only by the flag, and never in a build without the shop: the studio is never indexed. */
export function allowsIndexing(flag: boolean, parts: readonly SitePart[]): boolean {
  return flag && parts.includes("shop")
}

// "false" until launch: every page carries a noindex tag (vercel.json sends the same header; remove it at launch).
export const ALLOW_INDEXING = allowsIndexing(requireFlag("VITE_ALLOW_INDEXING", import.meta.env.VITE_ALLOW_INDEXING), SITE_PARTS)

// Not provided by Omar yet; the footer hides each icon until its address is set.
export const INSTAGRAM_URL: string | null = null
export const WHATSAPP_URL: string | null = null
