import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { actionVariants } from "@/components/ui/action-link"
import { Field, inputClass, PasswordInput } from "@/components/ui/field"
import { useAuth } from "@/features/auth/auth-context"
import AuthFrame from "@/features/auth/AuthFrame"
import { emptyCode } from "@/features/auth/code"
import CodeInput from "@/features/auth/CodeInput"
import PasswordRules from "@/features/auth/PasswordRules"
import { passwordOk } from "@/features/auth/rules"
import { AuthError } from "@/features/auth/types"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { isEmail } from "@/lib/validation"

const CODE_ERROR_ID = "reset-code-error"

// Cognito emails a 6-digit code (not a link), so the reset happens on this page in two steps.
export default function ForgotPassword() {
  const { m, to } = useLocale()
  const { client } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState(emptyCode)
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Partial<Record<"email" | "code" | "password" | "form", string>>>({})
  const [busy, setBusy] = useState(false)
  const t = m.auth.forgot

  // The send button is gone once the code step appears; keyboard and screen-reader focus moves to the first box.
  useEffect(() => {
    if (sentTo) document.getElementById("reset-code-0")?.focus()
  }, [sentTo])

  const fail = (failure: unknown, codeStep: boolean) => {
    setBusy(false)
    const reason = failure instanceof AuthError ? failure.code : "unavailable"
    if (codeStep && reason === "wrong_code") {
      setErrors({ code: m.auth.verify.wrongCode })
      document.getElementById("reset-code-0")?.focus()
    } else setErrors({ form: reason === "too_many_attempts" ? m.auth.tooManyAttempts : m.auth.unavailable })
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const error = !email.trim() ? m.auth.required : isEmail(email) ? undefined : m.auth.invalidEmail
    setErrors(error ? { email: error } : {})
    if (error) {
      document.getElementById("reset-email")?.focus()
      return
    }
    const address = email.trim().toLowerCase()
    setBusy(true)
    try {
      await client.forgotPassword(address)
      setBusy(false)
      setSentTo(address)
    } catch (failure) {
      fail(failure, false)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sentTo) return
    const found: typeof errors = {}
    if (!code.every(Boolean)) found.code = t.codeMissing
    if (!password) found.password = m.auth.required
    else if (!passwordOk(password)) found.password = m.auth.weakPassword
    setErrors(found)
    if (found.code) document.getElementById("reset-code-0")?.focus()
    else if (found.password) document.getElementById("reset-password")?.focus()
    if (found.code || found.password) return
    setBusy(true)
    try {
      await client.confirmForgotPassword(sentTo, code.join(""), password)
      toast.success(t.changed)
      navigate(`${to("/sign-in")}?email=${encodeURIComponent(sentTo)}`, { replace: true })
    } catch (failure) {
      fail(failure, true)
    }
  }

  const back = (
    <Link to={to("/sign-in")} className="flex min-h-11 items-center self-center text-sm text-accent underline underline-offset-4">
      {t.backToSignIn}
    </Link>
  )
  const formError = errors.form && (
    <p role="alert" className="text-sm text-destructive">
      {errors.form}
    </p>
  )
  const submitClass = cn(actionVariants({ variant: "solid", size: "lg" }), "w-full disabled:opacity-60")

  if (!sentTo) {
    return (
      <AuthFrame title={t.title} intro={t.intro}>
        <form noValidate onSubmit={send} className="flex flex-col gap-8">
          <Field id="reset-email" label={m.auth.email} error={errors.email}>
            {(control) => <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} {...control} />}
          </Field>
          {formError}
          <button type="submit" disabled={busy} className={submitClass}>
            {busy ? t.sending : t.send}
          </button>
        </form>
        {back}
      </AuthFrame>
    )
  }

  const [before, after = ""] = t.codeIntro.split("{email}")
  return (
    <AuthFrame
      title={t.codeTitle}
      intro={
        <>
          {before}
          <span className="text-foreground">{sentTo}</span>
          {after}
        </>
      }
    >
      <form noValidate onSubmit={save} className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <CodeInput
            idPrefix="reset-code"
            value={code}
            onChange={setCode}
            label={m.auth.verify.code}
            digitLabel={(n) => interpolate(m.auth.verify.digit, { n })}
            invalid={Boolean(errors.code)}
            describedBy={errors.code ? CODE_ERROR_ID : undefined}
          />
          {errors.code && (
            <p id={CODE_ERROR_ID} role="alert" className="text-center text-sm text-destructive">
              {errors.code}
            </p>
          )}
        </div>
        <Field id="reset-password" label={m.auth.newPassword} error={errors.password} hint={<PasswordRules password={password} />}>
          {(control) => (
            <PasswordInput
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showLabel={m.auth.show}
              hideLabel={m.auth.hide}
              {...control}
            />
          )}
        </Field>
        {formError}
        <button type="submit" disabled={busy} className={submitClass}>
          {busy ? t.saving : t.save}
        </button>
      </form>
      {back}
    </AuthFrame>
  )
}
