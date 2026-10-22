import { MoveRight } from "lucide-react"
import { Link } from "react-router"
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, instagramProfile, WHATSAPP_NUMBER, whatsappLink } from "@/config/site"
import { useLocale } from "@/i18n/useLocale"

const heading = "mb-1.5 text-label uppercase tracking-label text-dark-muted-foreground"
const pageLink = "flex min-h-11 w-max items-center text-xs uppercase tracking-label underline-offset-4 hover:underline"
const plainLink = "flex min-h-11 w-max items-center text-sm underline-offset-4 hover:underline"
const socialLink = "flex size-11 items-center justify-center rounded-full border border-dark-border hover:border-wine-on-dark"

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M4 20l1.2-4A8.3 8.3 0 1 1 8.3 19z" />
      <path d="M9 8.6c0 3.3 2.9 6.4 6.3 6.4l.9-1.6-2-.9-.8.8c-1-.4-2.1-1.5-2.5-2.5l.8-.8-.9-2-1.6.9z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function SiteFooter() {
  const { m, to } = useLocale()

  return (
    // The wine focus ring hardly shows on charcoal, so the footer's ring is Frost Stone, like the email field's line.
    <footer className="bg-dark-section px-gutter pb-10 pt-section text-dark-section-foreground [--ring:var(--dark-section-foreground)]">
      <div className="mx-auto flex max-w-content flex-col gap-16 lg:gap-28">
        <div className="flex flex-wrap items-start justify-between gap-x-16 gap-y-14">
          <Link to={to("/")} aria-label={m.nav.home} className="block w-full max-w-85">
            <img src="/brand/glowstone-wordmark-on-dark.svg" alt="" width={340} height={45} className="h-auto w-full" />
          </Link>

          {/* New-editions signup: wired to POST /subscribers in phase B7. */}
          <form className="flex w-full max-w-105 flex-col gap-3.5" onSubmit={(e) => e.preventDefault()}>
            <p className={heading}>{m.footer.newEditions}</p>
            <div className="flex items-center gap-5 border-b border-dark-border transition-[border-color,box-shadow] duration-500 focus-within:border-dark-section-foreground focus-within:shadow-[0_1px_0_var(--dark-section-foreground)]">
              <label htmlFor="footer-email" className="sr-only">
                {m.footer.emailPlaceholder}
              </label>
              <input
                id="footer-email"
                type="email"
                required
                autoComplete="email"
                placeholder={m.footer.emailPlaceholder}
                className="min-h-11 min-w-0 flex-1 bg-transparent py-2.5 text-body text-dark-section-foreground placeholder:text-dark-muted-foreground focus:outline-none"
              />
              <button type="submit" className="flex min-h-11 items-center gap-3.5 text-label uppercase tracking-label">
                {m.footer.subscribe}
                <MoveRight className="size-4.5 rtl:-scale-x-100" strokeWidth={1.1} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-10 border-t border-dark-border pt-12 sm:grid-cols-3">
          <div className="flex flex-col">
            <p className={heading}>{m.footer.visit}</p>
            <Link to={to("/collection")} className={pageLink}>{m.nav.collection}</Link>
            <Link to={to("/about")} className={pageLink}>{m.nav.about}</Link>
            <Link to={to("/contact")} className={pageLink}>{m.nav.contact}</Link>
          </div>
          <div className="flex flex-col">
            <p className={heading}>{m.footer.writeToUs}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={plainLink}>{CONTACT_EMAIL}</a>
            <div className="mt-2 flex gap-3">
              {INSTAGRAM_HANDLE && (
                <a href={instagramProfile(INSTAGRAM_HANDLE)} aria-label="Instagram" className={socialLink}>
                  <InstagramIcon />
                </a>
              )}
              <a href={whatsappLink(WHATSAPP_NUMBER)} aria-label="WhatsApp" className={socialLink}>
                <WhatsAppIcon />
              </a>
            </div>
          </div>
          <div className="flex flex-col">
            <p className={heading}>{m.footer.information}</p>
            <Link to={to("/legal/terms")} className={plainLink}>{m.footer.terms}</Link>
            <Link to={to("/legal/privacy")} className={plainLink}>{m.footer.privacy}</Link>
            <Link to={to("/legal/delivery")} className={plainLink}>{m.footer.delivery}</Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-5 text-xs text-dark-muted-foreground">
          <span className="flex items-center gap-4">
            <img src="/brand/glowstone-monogram-on-dark.svg" alt="" width={32} height={32} className="size-8" />
            <span className="font-display text-xl italic text-dark-section-foreground">{m.footer.madeInLebanon}</span>
          </span>
          <span className="uppercase tracking-widest">© {new Date().getFullYear()} {m.meta.siteName}</span>
        </div>
      </div>
    </footer>
  )
}
