import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, NavLink, useLocation } from "react-router"
import { SITE_URL } from "@/config/site"
import { SITE_PARTS, shopHref, studioPath } from "@/config/studio"
import { interpolate } from "@/i18n/format"
import { cn } from "@/lib/utils"
import { useAdminAuth } from "./auth/admin-auth-context"
import { studioDemo } from "./auth/client"
import { STUDIO_COPY } from "./copy"
import type { AdminOrderSummary } from "./orders"
import { pendingIn, PendingOrdersContext, type PendingOrdersValue } from "./pending-orders"

interface StudioShellProps {
  children: React.ReactNode
}

const s = STUDIO_COPY.shell
// On charcoal the site's wine focus ring is too faint, so focus is drawn in light stone here.
const darkLink =
  "flex min-h-11 items-center text-label uppercase tracking-caps text-dark-section-foreground transition-colors duration-500 hover:text-on-photo focus-visible:outline-on-photo"

const SECTIONS = [
  { path: "/orders", label: s.orders, counted: true },
  { path: "/products", label: s.products, counted: false },
  { path: "/customers", label: s.customers, counted: false },
] as const

const HOME = studioPath("/orders")

interface SectionLabelProps {
  label: string
  pending: number
}

// "Orders 2" on screen; the link itself is named "Orders, 2 pending" (sectionName).
function SectionLabel({ label, pending }: SectionLabelProps) {
  return (
    <>
      {label}
      {pending > 0 && <span className="ms-2 min-w-5 bg-wine-on-dark px-1.5 text-center text-label leading-5 tracking-normal text-on-photo">{pending}</span>}
    </>
  )
}

const sectionName = (label: string, pending: number) => (pending > 0 ? `${label}, ${interpolate(s.pending, { count: pending })}` : undefined)

// The prototype's studio frame: a charcoal sidebar on desktop; on smaller screens a charcoal top bar, with the
// sections in it from sm up and in a bottom tab bar on phones.
export default function StudioShell({ children }: StudioShellProps) {
  const { email, api } = useAdminAuth()
  const { pathname } = useLocation()
  const [pending, setPending] = useState(0)

  // The count is a hint next to a link: when the orders can't be read, the last count stays and the Orders page
  // itself says what went wrong.
  const refresh = useCallback(() => {
    api.listOrders().then(
      (orders) => setPending(pendingIn(orders)),
      () => {},
    )
  }, [api])
  const report = useCallback((orders: readonly AdminOrderSummary[]) => setPending(pendingIn(orders)), [])
  const counter = useMemo<PendingOrdersValue>(() => ({ report, refresh }), [report, refresh])

  // Read again on every page change; the Orders list reports what it read instead.
  useEffect(() => {
    if (pathname !== HOME) refresh()
  }, [pathname, refresh])

  // Signing out is a page of its own, so an open form with unsaved changes asks first, like for any other link.
  const signOutLink = (className?: string) => (
    <Link to={studioPath("/sign-out")} className={cn(darkLink, className)}>
      {s.signOut}
    </Link>
  )
  const shopLink = (label: string, className?: string) => (
    <a href={shopHref(SITE_PARTS, SITE_URL)} target="_blank" rel="noopener noreferrer" className={cn(darkLink, className)}>
      {label} <span aria-hidden="true">↗</span>
    </a>
  )
  const links = (className: (active: boolean) => string) =>
    SECTIONS.map((section) => (
      <NavLink
        key={section.path}
        to={studioPath(section.path)}
        aria-label={sectionName(section.label, section.counted ? pending : 0)}
        className={({ isActive }) => cn(darkLink, className(isActive))}
      >
        <SectionLabel label={section.label} pending={section.counted ? pending : 0} />
      </NavLink>
    ))

  return (
    <PendingOrdersContext.Provider value={counter}>
      <div className="min-h-svh bg-studio-surface lg:flex">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:bg-primary focus:px-4 focus:py-3 focus:text-label focus:uppercase focus:tracking-label focus:text-primary-foreground"
        >
          {s.skipToContent}
        </a>

        <aside className="sticky top-0 hidden h-svh w-62 flex-none flex-col bg-dark-section px-4 pt-7 pb-5 lg:flex">
          <Link to={HOME} aria-label={s.home} className="flex flex-col gap-3 px-3 pb-7 focus-visible:outline-on-photo">
            <img src="/brand/glowstone-wordmark-header-on-dark.svg" alt="" width={192} height={15} className="block h-auto w-42.5" />
            <span className="text-label uppercase tracking-label text-dark-muted-foreground">{STUDIO_COPY.studio}</span>
          </Link>
          <span aria-hidden="true" className="mx-3 mb-5 h-px w-12 bg-wine-on-dark" />
          <nav aria-label={s.navLabel} className="flex flex-col gap-0.5">
            {links((active) => cn("px-3 hover:bg-dark-border", active && "bg-dark-border text-on-photo"))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-dark-border px-3 pt-5">
            {shopLink(s.viewShop)}
            <p className="truncate py-2 text-sm text-dark-muted-foreground">{email}</p>
            {signOutLink("self-start")}
          </div>
        </aside>

        <header data-studio-header className="sticky top-0 z-30 flex h-(--studio-header) items-center justify-between gap-3 bg-dark-section px-4 lg:hidden">
          <Link to={HOME} aria-label={s.home} className="flex min-h-11 items-center gap-3 focus-visible:outline-on-photo">
            <img src="/brand/glowstone-monogram-on-dark.svg" alt="" width={26} height={26} className="size-6.5" />
            <span className="text-label uppercase tracking-label text-dark-section-foreground">{STUDIO_COPY.studio}</span>
          </Link>
          <nav aria-label={s.navLabel} className="hidden items-center gap-6 sm:flex">
            {links((active) => cn("border-b border-transparent", active && "border-wine-on-dark text-on-photo"))}
          </nav>
          <div className="flex items-center gap-5">
            {shopLink(s.shop)}
            {signOutLink()}
          </div>
        </header>

        <main
          id="main"
          className="w-full max-w-330 min-w-0 flex-1 px-4 pt-5 pb-[calc(var(--studio-tab-bar)+var(--studio-save-bar)+2rem)] sm:pb-28 lg:px-10 lg:pt-8 lg:pb-14"
        >
          {studioDemo && <p className="mb-5 border-y border-border py-3 text-sm text-muted-foreground">{s.demoNote}</p>}
          {children}
        </main>

        <nav
          data-studio-tab-bar
          aria-label={s.navLabel}
          className="fixed inset-x-0 bottom-0 z-40 grid h-(--studio-tab-bar) grid-cols-3 bg-dark-section sm:hidden"
        >
          {links((active) => cn("justify-center border-t border-transparent", active && "border-wine-on-dark text-on-photo"))}
        </nav>
      </div>
    </PendingOrdersContext.Provider>
  )
}
