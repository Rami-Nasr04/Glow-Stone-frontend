import { Dialog } from "radix-ui"
import { ShoppingBag, User } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, NavLink } from "react-router"
import { CONTACT_EMAIL } from "@/config/site"
import { ACCOUNTS_OPEN } from "@/features/auth/client"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

interface SiteHeaderProps {
  /** Transparent while over the home hero; turns solid stone once the page scrolls. */
  overHero?: boolean
  /** Account icon and menu link; hidden until customer accounts are live. */
  accountsOpen?: boolean
}

const NAV = [
  { path: "/collection", key: "collection" },
  { path: "/about", key: "about" },
  { path: "/contact", key: "contact" },
] as const

const navLabel = "flex min-h-11 items-center text-label uppercase tracking-label"
const iconLink = "flex size-11 items-center justify-center"

function Wordmark() {
  return <img src="/brand/glowstone-wordmark-header.svg" alt="" width={192} height={15} className="h-2.75 w-auto lg:h-3.75" />
}

export default function SiteHeader({ overHero = false, accountsOpen = ACCOUNTS_OPEN }: SiteHeaderProps) {
  const { m, to } = useLocale()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [overHero])

  const solid = !overHero || scrolled
  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-700",
        solid ? "border-border bg-background" : "border-transparent bg-transparent",
      )}
    >
      <div className="flex h-16 items-center justify-between px-5 lg:grid lg:h-21 lg:grid-cols-[1fr_auto_1fr] lg:px-12">
        {/* Over the mobile hero the big hero wordmark is already on screen, so the small one waits
            (but still shows when a keyboard user tabs onto it). */}
        <Link
          to={to("/")}
          aria-label={m.nav.home}
          className={cn(
            "flex min-h-11 w-max items-center transition-opacity duration-700",
            !solid && "max-lg:pointer-events-none max-lg:opacity-0 focus-visible:opacity-100",
          )}
        >
          <Wordmark />
        </Link>

        <nav aria-label={m.nav.main} className="hidden lg:flex lg:gap-12">
          {NAV.map((item) => (
            <NavLink key={item.path} to={to(item.path)} className={navLabel}>
              {({ isActive }) => (
                <span className={cn("border-b pb-1.25 pt-1.5 transition-colors duration-500", isActive ? "border-accent" : "border-transparent")}>
                  {m.nav[item.key]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1 lg:gap-5">
          {accountsOpen && (
            <Link to={to("/account")} aria-label={m.nav.account} className={cn(iconLink, "hidden lg:flex")}>
              <User className="size-5" strokeWidth={1.1} />
            </Link>
          )}
          <Link to={to("/cart")} aria-label={m.nav.cart} className={iconLink}>
            <ShoppingBag className="size-5" strokeWidth={1.1} />
          </Link>

          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger className={cn(navLabel, "ps-3 lg:hidden")}>{m.nav.menu}</Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-background px-5 pb-10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-700">
                <div className="flex h-16 items-center justify-between">
                  <Dialog.Title className="sr-only">{m.nav.menu}</Dialog.Title>
                  <Dialog.Description className="sr-only">{m.meta.siteName}</Dialog.Description>
                  <Link to={to("/")} aria-label={m.nav.home} onClick={closeMenu} className="flex min-h-11 items-center">
                    <Wordmark />
                  </Link>
                  <div className="flex items-center gap-1">
                    <Link to={to("/cart")} aria-label={m.nav.cart} onClick={closeMenu} className={iconLink}>
                      <ShoppingBag className="size-5" strokeWidth={1.1} />
                    </Link>
                    <Dialog.Close className={cn(navLabel, "ps-3")}>{m.nav.close}</Dialog.Close>
                  </div>
                </div>

                <nav aria-label={m.nav.main} className="mt-12 flex flex-col gap-2">
                  {NAV.map((item, i) => (
                    <Link
                      key={item.path}
                      to={to(item.path)}
                      onClick={closeMenu}
                      className="flex items-baseline justify-between border-b border-border py-1.5 font-display text-display-m font-light"
                    >
                      {m.nav[item.key]}
                      <span className="font-sans text-label tracking-label text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-7">
                  <span aria-hidden="true" className="h-px w-12 bg-accent" />
                  {accountsOpen && (
                    <Link to={to("/account")} onClick={closeMenu} className={cn(navLabel, "w-max")}>
                      {m.nav.account}
                    </Link>
                  )}
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <a href={`mailto:${CONTACT_EMAIL}`} className="flex min-h-11 w-max items-center">
                      {CONTACT_EMAIL}
                    </a>
                    <span className="font-display text-lead italic">{m.footer.madeInLebanon}</span>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  )
}
