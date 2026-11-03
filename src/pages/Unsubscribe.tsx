import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { ActionLink } from "@/components/ui/action-link"
import BrandIcon from "@/components/ui/BrandIcon"
import { Rule } from "@/components/ui/rule"
import NewsSignup from "@/features/news/NewsSignup"
import { unsubscribe } from "@/features/news/unsubscribe"
import { useLocale } from "@/i18n/useLocale"

type State = { step: "working" } | { step: "done" } | { step: "invalid"; message: string } | { step: "failed" }

// The email's unsubscribe link: /unsubscribe?t=<token> (contract "Announcements", 2026-11-03). It asks the API once on
// load; the token is only ever sent there, never logged or kept. Quiet, like the 404, in the site frame.
export default function Unsubscribe() {
  const { m, to } = useLocale()
  const u = m.unsubscribe
  const token = useSearchParams()[0].get("t")?.trim() ?? ""
  const [state, setState] = useState<State>(token ? { step: "working" } : { step: "invalid", message: u.invalid })
  const [rejoining, setRejoining] = useState(false)
  // React runs effects twice in development: one request per link.
  const asked = useRef<string | null>(null)

  useEffect(() => {
    if (!token || asked.current === token) return
    asked.current = token
    void unsubscribe(token).then((result) => {
      if (result.ok) setState({ step: "done" })
      else if (result.reason === "invalid") setState({ step: "invalid", message: result.message ?? u.invalid })
      else setState({ step: "failed" })
    })
  }, [token, u.invalid])

  // "Join again" is replaced by the sign-up: focus follows to its field.
  useEffect(() => {
    if (rejoining) document.getElementById("rejoin-news-email")?.focus()
  }, [rejoining])

  const title = state.step === "done" ? u.doneTitle : state.step === "working" ? null : u.invalidTitle
  const lead = state.step === "done" ? u.doneLead : state.step === "invalid" ? state.message : state.step === "failed" ? u.failed : null

  return (
    <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-8 px-gutter py-24 text-center">
      <BrandIcon className="h-16 opacity-50" />
      <p className="text-label uppercase tracking-label text-muted-foreground">{u.label}</p>
      {state.step === "working" ? (
        <p role="status" className="text-muted-foreground">
          {u.working}
        </p>
      ) : (
        <>
          <h1 className="max-w-205 font-display text-display-l leading-[1.08] font-light italic text-balance">{title}</h1>
          <Rule />
          <p role={state.step === "done" ? undefined : "alert"} className="max-w-110 text-muted-foreground">
            {lead}
          </p>
        </>
      )}
      {state.step === "done" &&
        (rejoining ? (
          <NewsSignup id="rejoin-news" tone="light" className="w-full max-w-90 text-start" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {u.changedMind}{" "}
            <button type="button" onClick={() => setRejoining(true)} className="min-h-11 text-foreground underline underline-offset-4 transition-colors duration-500 hover:text-accent">
              {u.joinAgain}
            </button>
          </p>
        ))}
      {(state.step === "invalid" || state.step === "failed") && (
        <ActionLink to={to("/")} arrow={false}>
          {u.home}
        </ActionLink>
      )}
    </section>
  )
}
