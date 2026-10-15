import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router"
import { studioPath } from "@/config/studio"
import { cn } from "@/lib/utils"
import { useAdminAuth } from "./auth/admin-auth-context"
import { STUDIO_COPY } from "./copy"
import { hasOpenDrafts } from "./drafts"
import LeaveDialog from "./LeaveDialog"

interface StudioShellProps {
  children: React.ReactNode
}

const s = STUDIO_COPY.shell
const darkLink = "flex min-h-11 items-center text-label uppercase tracking-caps text-dark-section-foreground transition-colors duration-500 hover:text-on-photo"

// The prototype's studio frame: a charcoal sidebar on desktop, a charcoal top bar on phones. The studio has one
// section for now (products), so phones get no bottom tab bar.
export default function StudioShell({ children }: StudioShellProps) {
  const { email, signOut } = useAdminAuth()
  const navigate = useNavigate()
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)

  const leave = async () => {
    setAsking(false)
    setBusy(true)
    await signOut()
    navigate(studioPath("/sign-in"), { replace: true })
  }
  const askThenLeave = () => (hasOpenDrafts() ? setAsking(true) : void leave())

  const signOutButton = (className?: string) => (
    <button type="button" onClick={askThenLeave} disabled={busy} className={cn(darkLink, className)}>
      {busy ? s.signingOut : s.signOut}
    </button>
  )
  const shopLink = (label: string, className?: string) => (
    <a href="/" target="_blank" rel="noopener noreferrer" className={cn(darkLink, className)}>
      {label} <span aria-hidden="true">↗</span>
    </a>
  )
  const nav = (
    <nav aria-label={s.navLabel} className="flex flex-col gap-0.5">
      <NavLink
        to={studioPath("/products")}
        className={({ isActive }) => cn(darkLink, "px-3 hover:bg-dark-border", isActive && "bg-dark-border text-on-photo")}
      >
        {s.products}
      </NavLink>
    </nav>
  )

  return (
    <div className="min-h-svh bg-studio-surface lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:bg-primary focus:px-4 focus:py-3 focus:text-label focus:uppercase focus:tracking-label focus:text-primary-foreground"
      >
        {s.skipToContent}
      </a>

      <aside className="sticky top-0 hidden h-svh w-62 flex-none flex-col bg-dark-section px-4 pt-7 pb-5 lg:flex">
        <Link to={studioPath("/products")} aria-label={s.home} className="flex flex-col gap-3 px-3 pb-7">
          <img src="/brand/glowstone-wordmark-header-on-dark.svg" alt="" width={192} height={15} className="block h-auto w-42.5" />
          <span className="text-label uppercase tracking-label text-dark-muted-foreground">{STUDIO_COPY.studio}</span>
        </Link>
        <span aria-hidden="true" className="mx-3 mb-5 h-px w-12 bg-wine-on-dark" />
        {nav}
        <div className="mt-auto flex flex-col gap-1 border-t border-dark-border px-3 pt-5">
          {shopLink(s.viewShop)}
          <p className="truncate py-2 text-sm text-dark-muted-foreground">{email}</p>
          {signOutButton("self-start")}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-15 items-center justify-between gap-3 bg-dark-section px-4 lg:hidden">
        <Link to={studioPath("/products")} aria-label={s.home} className="flex min-h-11 items-center gap-3">
          <img src="/brand/glowstone-monogram-on-dark.svg" alt="" width={26} height={26} className="size-6.5" />
          <span className="text-label uppercase tracking-label text-dark-section-foreground">{STUDIO_COPY.studio}</span>
        </Link>
        <div className="flex items-center gap-5">
          {shopLink(s.shop)}
          {signOutButton()}
        </div>
      </header>

      <main id="main" className="w-full max-w-330 min-w-0 flex-1 px-4 pt-5 pb-28 lg:px-10 lg:pt-8 lg:pb-14">
        {children}
      </main>

      <LeaveDialog open={asking} onStay={() => setAsking(false)} onLeave={() => void leave()} />
    </div>
  )
}
