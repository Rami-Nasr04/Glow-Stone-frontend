// Public contact channels. These move to the editable settings (GET /settings/public) once the API is live.
export const CONTACT_EMAIL = "glowstone216@gmail.com"

// Absolute origin for canonical links and link previews. Set VITE_SITE_URL to the Vercel URL until the domain is live.
const siteUrlFromEnv: string | undefined = import.meta.env.VITE_SITE_URL
export const SITE_URL = siteUrlFromEnv || "https://glowstonelb.com"

// Not provided by Omar yet; the footer hides each icon until its address is set.
export const INSTAGRAM_URL: string | null = null
export const WHATSAPP_URL: string | null = null
