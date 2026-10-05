import { Outlet, useLocation, useParams } from "react-router"
import SiteFooter from "@/components/layout/SiteFooter"
import SiteHeader from "@/components/layout/SiteHeader"
import { isLocale } from "@/i18n/locales"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import NotFound from "@/pages/NotFound"

export default function LocaleLayout() {
  const { lang } = useParams()
  const { pathname } = useLocation()
  const { m, to } = useLocale()
  // ":lang?" matches any first segment; anything that is not a locale is a missing page (inside the site frame).
  const unknownPrefix = lang !== undefined && !isLocale(lang)
  const isHome = !unknownPrefix && pathname.replace(/\/$/, "") === to("/").replace(/\/$/, "")
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:bg-primary focus:px-4 focus:py-3 focus:text-label focus:uppercase focus:tracking-label focus:text-primary-foreground"
      >
        {m.nav.skipToContent}
      </a>
      <SiteHeader overHero={isHome} />
      {/* The header is fixed; every page except the home hero starts below it. */}
      <main id="main" className={cn("flex-1", !isHome && "pt-16 lg:pt-21")}>
        {unknownPrefix ? <NotFound /> : <Outlet />}
      </main>
      <SiteFooter />
    </div>
  )
}
