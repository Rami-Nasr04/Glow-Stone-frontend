import { requireUrl } from "@/lib/env"

// Public contact channels. These move to the editable settings (GET /settings/public) once the API is live.
export const CONTACT_EMAIL = "glowstone216@gmail.com"

// Absolute origin for canonical links and link previews (VITE_SITE_URL; the build stops without it).
export const SITE_URL = requireUrl("VITE_SITE_URL", import.meta.env.VITE_SITE_URL)

// Not provided by Omar yet; the footer hides each icon until its address is set.
export const INSTAGRAM_URL: string | null = null
export const WHATSAPP_URL: string | null = null
