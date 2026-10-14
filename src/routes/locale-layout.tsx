import { Outlet, useLocation, useMatches, useParams } from "react-router"
import SiteFooter from "@/components/layout/SiteFooter"
import SiteHeader from "@/components/layout/SiteHeader"
import { knownPrefix } from "@/i18n/paths"
import { useLocale } from "@/i18n/useLocale"
import type { RouteHandle } from "@/lib/route-handle"
import { cn } from "@/lib/utils"
import NotFound from "@/pages/NotFound"

export default function LocaleLayout() {
  const { lang } = useParams()
  const { pathname } = useLocation()
  const { m, to } = useLocale()
  const matches = useMatches()
  // ":lang?" matches any first segment; anything that is not a published locale is a missing page (inside the
  // site frame). Arabic and French stay unpublished until the I18N phase.
  const unknownPrefix = !knownPrefix(lang)
  const isHome = !unknownPrefix && pathname.replace(/\/$/, "") === to("/").replace(/\/$/, "")
  // Sign-in pages are full screen: no site header or footer.
  const bare = !unknownPrefix && matches.some((match) => (match.handle as RouteHandle | undefined)?.bare === true)
  const skipLink = (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:bg-primary focus:px-4 focus:py-3 focus:text-label focus:uppercase focus:tracking-label focus:text-primary-foreground"
    >
      {m.nav.skipToContent}
    </a>
  )
  if (bare) {
    return (
      <div className="flex min-h-svh flex-col">
        {skipLink}
        <main id="main" className="flex-1">
          <Outlet />
        </main>
      </div>
    )
  }
  return (
    <div className="flex min-h-svh flex-col">
      {skipLink}
      <SiteHeader overHero={isHome} />
      {/* The header is fixed; every page except the home hero starts below it. */}
      <main id="main" className={cn("flex-1", !isHome && "pt-16 lg:pt-21")}>
        {unknownPrefix ? <NotFound /> : <Outlet />}
      </main>
      <SiteFooter />
    </div>
  )
}
