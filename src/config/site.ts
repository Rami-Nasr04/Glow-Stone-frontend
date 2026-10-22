import { type SitePart, SITE_PARTS } from "@/config/studio"
import { requireFlag, requireUrl } from "@/lib/env"

// Public contact channels. They live here, in code: a change is a commit and a deploy.
export const CONTACT_EMAIL = "glowstone216@gmail.com"
/** Omar's WhatsApp, in international form; every WhatsApp link is built from it by `whatsappLink`. */
export const WHATSAPP_NUMBER = "+96171284863"
/** The Instagram handle, without "@". While it is null every Instagram link and button stays hidden. */
export const INSTAGRAM_HANDLE: string | null = null

/** A chat with `number` (wa.me takes the digits alone), with `text` typed in when given. */
export function whatsappLink(number: string, text?: string): string {
  const chat = `https://wa.me/${number.replace(/\D/g, "")}`
  return text ? `${chat}?text=${encodeURIComponent(text)}` : chat
}

export const instagramProfile = (handle: string) => `https://instagram.com/${handle}`

/** A direct message to `handle`. Instagram can't fill in the text, so the message goes on the clipboard first. */
export const instagramDm = (handle: string) => `https://ig.me/m/${handle}`

// Absolute origin for canonical links and link previews (VITE_SITE_URL; the build stops without it).
export const SITE_URL = requireUrl("VITE_SITE_URL", import.meta.env.VITE_SITE_URL)

/** Indexing is allowed only by the flag, and never in a build without the shop: the studio is never indexed. */
export function allowsIndexing(flag: boolean, parts: readonly SitePart[]): boolean {
  return flag && parts.includes("shop")
}

// "false" until launch: every page carries a noindex tag (vercel.json sends the same header; remove it at launch).
export const ALLOW_INDEXING = allowsIndexing(requireFlag("VITE_ALLOW_INDEXING", import.meta.env.VITE_ALLOW_INDEXING), SITE_PARTS)
