import { Rule } from "@/components/ui/rule"
import { STUDIO_COPY } from "./copy"

interface StudioAuthFrameProps {
  title: string
  intro: React.ReactNode
  children: React.ReactNode
}

// The studio's sign-in pages: the shop's sign-in frame with the studio's name under the wordmark, and no way into the
// shop's own account pages.
export default function StudioAuthFrame({ title, intro, children }: StudioAuthFrameProps) {
  return (
    <div className="flex min-h-svh flex-col items-center px-5">
      <div className="mt-[clamp(3.5rem,9vh,6.5rem)] flex w-[min(340px,86vw)] flex-col items-center gap-4 lg:w-105">
        <img src="/brand/glowstone-wordmark.svg" alt="Glowstone" width={1004} height={137} className="block h-auto w-full" />
        <span className="text-label uppercase tracking-label text-muted-foreground">{STUDIO_COPY.studio}</span>
      </div>

      <main id="main" className="mt-[clamp(3rem,7vh,5rem)] mb-16 flex w-full max-w-105 flex-col gap-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="font-display text-[clamp(2.5rem,5vw,3.25rem)] leading-[1.05] font-light">{title}</h1>
          <Rule />
          <p className="text-small text-pretty text-muted-foreground">{intro}</p>
        </div>
        {children}
      </main>
    </div>
  )
}
