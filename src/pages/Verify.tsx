import { useEffect, useState } from "react"
import { Navigate, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { actionVariants } from "@/components/ui/action-link"
import { useAuth } from "@/features/auth/auth-context"
import AuthFrame from "@/features/auth/AuthFrame"
import { emptyCode } from "@/features/auth/code"
import CodeInput from "@/features/auth/CodeInput"
import { AFTER_SIGN_IN, safeNext } from "@/features/auth/next-path"
import { takePendingPassword } from "@/features/auth/pending-password"
import { AuthError } from "@/features/auth/types"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

const RESEND_WAIT_SECONDS = 30
const ERROR_ID = "verify-code-error"

export default function Verify() {
  const { m, to } = useLocale()
  const { client, signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get("email")?.trim().toLowerCase() ?? ""
  const next = params.get("next")
  const [code, setCode] = useState(emptyCode)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS)
  const t = m.auth.verify

  // Visitors arrive from sign-up or sign-in: start them on the first box.
  useEffect(() => {
    document.getElementById("verify-code-0")?.focus()
  }, [])

  const counting = wait > 0
  useEffect(() => {
    if (!counting) return
    const timer = window.setInterval(() => setWait((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [counting])

  if (!email) return <Navigate replace to={to("/sign-up")} />

  const complete = code.every(Boolean)
  const [before, after = ""] = t.intro.split("{email}")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!complete) return
    setBusy(true)
    setError(null)
    try {
      await client.confirmSignUp(email, code.join(""))
      const password = takePendingPassword(email)
      if (password) {
        await signIn(email, password)
        navigate(safeNext(next, to(AFTER_SIGN_IN)), { replace: true })
        return
      }
      toast.success(t.verified)
      navigate(`${to("/sign-in")}?email=${encodeURIComponent(email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`, { replace: true })
    } catch (failure) {
      setBusy(false)
      const reason = failure instanceof AuthError ? failure.code : "unavailable"
      if (reason === "wrong_code") {
        setError(t.wrongCode)
        document.getElementById("verify-code-0")?.focus()
      } else setError(reason === "too_many_attempts" ? m.auth.tooManyAttempts : m.auth.unavailable)
    }
  }

  const resend = async () => {
    try {
      await client.resendCode(email)
      toast.success(t.resent)
      setWait(RESEND_WAIT_SECONDS)
    } catch {
      toast.error(m.auth.unavailable)
    }
  }

  return (
    <AuthFrame
      title={t.title}
      intro={
        <>
          {before}
          <span className="text-foreground">{email}</span>
          {after}
        </>
      }
    >
      <form noValidate onSubmit={submit} className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <CodeInput
            idPrefix="verify-code"
            value={code}
            onChange={(nextCode) => {
              setCode(nextCode)
              setError(null)
            }}
            label={t.code}
            digitLabel={(n) => interpolate(t.digit, { n })}
            invalid={Boolean(error)}
            describedBy={error ? ERROR_ID : undefined}
          />
          {error && (
            <p id={ERROR_ID} role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!complete || busy}
          className={cn(actionVariants({ variant: "solid", size: "lg" }), "w-full disabled:opacity-45")}
        >
          {busy ? t.submitting : t.submit}
        </button>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>{t.noCode}</span>
          <button
            type="button"
            onClick={resend}
            disabled={wait > 0}
            className={cn("min-h-11 px-1 text-label uppercase tracking-caps", wait > 0 ? "text-muted-foreground" : "text-accent")}
          >
            {wait > 0 ? interpolate(t.resendIn, { seconds: String(wait).padStart(2, "0") }) : t.resend}
          </button>
        </div>
      </form>
    </AuthFrame>
  )
}
