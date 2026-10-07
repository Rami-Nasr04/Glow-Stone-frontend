import { Link } from "react-router"
import { Rule } from "@/components/ui/rule"
import { useLocale } from "@/i18n/useLocale"
import { useAuth } from "./auth-context"

interface AuthFrameProps {
  title: string
  intro: React.ReactNode
  children: React.ReactNode
}

// Full-screen frame of the sign-in pages (no site header or footer), as in the prototype.
export default function AuthFrame({ title, intro, children }: AuthFrameProps) {
  const { m, to } = useLocale()
  const { client } = useAuth()
  return (
    <div className="flex min-h-svh flex-col items-center px-5">
      <Link to={to("/")} aria-label={m.nav.home} className="mt-[clamp(3.5rem,9vh,6.5rem)] flex min-h-11 w-[min(260px,70vw)] items-center">
        <img src="/brand/glowstone-wordmark.svg" alt="" width={1004} height={137} className="block h-auto w-full" />
      </Link>

      <div className="mt-[clamp(3.5rem,8vh,5.5rem)] mb-16 flex w-full max-w-105 flex-col gap-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="font-display text-[clamp(2.5rem,5vw,3.25rem)] leading-[1.05] font-light">{title}</h1>
          <Rule />
          <p className="text-small text-pretty text-muted-foreground">{intro}</p>
          {client.mode === "demo" && <p className="w-full border-y border-border py-3 text-sm text-muted-foreground">{m.auth.demoNote}</p>}
        </div>
        {children}
      </div>

      <p className="mt-auto mb-8 font-display text-lg text-muted-foreground italic">{m.auth.madeInLebanon}</p>
    </div>
  )
}
