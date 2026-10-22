import { CircleAlert, MoveRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { isEmail } from "@/lib/validation"
import SpamTrap from "./SpamTrap"
import { subscribe } from "./subscribe"

interface NewsSignupProps {
  /** Prefix for the field's id; each sign-up on a page needs its own. */
  id: string
  /** "dark" in the charcoal footer (label hidden behind the placeholder), "light" on a sold-out piece. */
  tone: "dark" | "light"
  className?: string
}

type State =
  | { step: "idle" }
  | { step: "sending" }
  | { step: "done" }
  | { step: "error"; message: string; field: boolean; announce: boolean }

const TONES = {
  dark: {
    row: "items-center border-dark-border focus-within:border-dark-section-foreground focus-within:shadow-[0_1px_0_var(--dark-section-foreground)]",
    label: "sr-only",
    input: "py-2.5 text-dark-section-foreground placeholder:text-dark-muted-foreground",
    note: "text-dark-section-foreground",
  },
  light: {
    row: "items-end border-primary focus-within:border-accent focus-within:shadow-[0_1px_0_var(--accent)] has-aria-invalid:border-accent",
    label: "text-label uppercase tracking-label text-muted-foreground transition-colors duration-500 group-focus-within:text-accent",
    input: "pt-1.5 pb-3 placeholder:text-muted-foreground",
    note: "text-destructive",
  },
}

// POST /subscribers with rejoin: the visitor asked for news, so an earlier unsubscribe is undone.
export default function NewsSignup({ id, tone, className }: NewsSignupProps) {
  const { m } = useLocale()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<State>({ step: "idle" })
  const fieldRef = useRef<HTMLInputElement>(null)
  const trapRef = useRef<HTMLInputElement>(null)
  const thanksRef = useRef<HTMLParagraphElement>(null)
  const sending = state.step === "sending"
  const t = TONES[tone]
  const dark = tone === "dark"

  // The form is replaced by the thanks: focus follows, so a keyboard user isn't dropped at the top of the page.
  useEffect(() => {
    if (state.step === "done") thanksRef.current?.focus()
  }, [state.step])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setState({ step: "error", message: m.news.invalidEmail, field: true, announce: false })
      fieldRef.current?.focus()
      return
    }
    setState({ step: "sending" })
    const result = await subscribe({ email: email.trim(), rejoin: true, website: trapRef.current?.value ?? "" })
    if (result.ok) setState({ step: "done" })
    else if (result.reason === "invalid") setState({ step: "error", message: result.message ?? m.news.invalidEmail, field: true, announce: true })
    else setState({ step: "error", message: result.reason === "busy" ? m.news.tooMany : m.news.failed, field: false, announce: true })
  }

  if (state.step === "done") {
    return (
      <div role="status" className={className}>
        <p ref={thanksRef} tabIndex={-1} className={cn("text-small focus:outline-none", dark ? "text-dark-muted-foreground" : "text-muted-foreground")}>
          {m.news.thanks}
        </p>
      </div>
    )
  }

  const error = state.step === "error" ? state : null
  const messageId = `${id}-message`
  const label = dark ? m.footer.emailPlaceholder : m.news.email

  return (
    <form noValidate onSubmit={submit} className={cn("group flex flex-col gap-3", className)}>
      <div className={cn("flex gap-5 border-b transition-[border-color,box-shadow] duration-500", t.row)}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={`${id}-email`} className={t.label}>
            {label}
          </label>
          <input
            ref={fieldRef}
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={dark ? m.footer.emailPlaceholder : m.news.placeholder}
            aria-invalid={error?.field ? true : undefined}
            aria-describedby={error?.field ? messageId : undefined}
            className={cn("min-h-11 w-full min-w-0 bg-transparent text-body focus:outline-none", t.input)}
          />
        </div>
        <button type="submit" disabled={sending} className="flex min-h-11 shrink-0 items-center gap-3.5 text-label uppercase tracking-label disabled:opacity-60">
          {sending ? m.news.sending : dark ? m.footer.subscribe : m.news.notifyMe}
          <MoveRight className="size-4.5 rtl:-scale-x-100" strokeWidth={1.1} aria-hidden="true" />
        </button>
      </div>
      <SpamTrap ref={trapRef} />
      {error && (
        <p id={messageId} role={error.announce ? "alert" : undefined} className={cn("flex items-center gap-2 text-sm", t.note)}>
          <CircleAlert aria-hidden="true" strokeWidth={1.25} className="size-4 shrink-0" />
          {error.message}
        </p>
      )}
    </form>
  )
}
