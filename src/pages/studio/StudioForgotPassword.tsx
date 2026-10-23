import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { actionVariants } from "@/components/ui/action-link"
import { Field, inputClass, PasswordInput } from "@/components/ui/field"
import { safeStudioNext, studioPath } from "@/config/studio"
import { emptyCode } from "@/features/auth/code"
import CodeInput from "@/features/auth/CodeInput"
import PasswordChecklist from "@/features/auth/PasswordChecklist"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { ADMIN_PASSWORD_RULES, adminPasswordOk } from "@/features/studio/auth/password"
import { AdminAuthError } from "@/features/studio/auth/types"
import { STUDIO_COPY } from "@/features/studio/copy"
import StudioAuthFrame from "@/features/studio/StudioAuthFrame"
import { interpolate } from "@/i18n/format"
import { cn } from "@/lib/utils"
import { isEmail } from "@/lib/validation"

type Errors = Partial<Record<"email" | "code" | "password" | "repeat" | "form", string>>

const t = STUDIO_COPY.forgot
const CODE_ERROR_ID = "studio-reset-code-error"

// Cognito emails a 6-digit code, so the reset happens here in two steps. The first step always answers the same way,
// so nobody can learn which emails have an account (C.3).
export default function StudioForgotPassword() {
  const { startPasswordReset, finishPasswordReset } = useAdminAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState(emptyCode)
  const [password, setPassword] = useState("")
  const [repeat, setRepeat] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (sentTo) document.getElementById("studio-reset-code-0")?.focus()
  }, [sentTo])

  const request = async (address: string) => {
    setBusy(true)
    try {
      await startPasswordReset(address)
      setSentTo(address)
      setExpired(false)
      setCode(emptyCode())
      setErrors({})
    } catch {
      setErrors({ form: STUDIO_COPY.unavailable })
    }
    setBusy(false)
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const error = !email.trim() ? STUDIO_COPY.required : isEmail(email) ? undefined : STUDIO_COPY.invalidEmail
    setErrors(error ? { email: error } : {})
    if (error) {
      document.getElementById("studio-reset-email")?.focus()
      return
    }
    await request(email.trim())
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sentTo) return
    const found: Errors = {}
    if (!code.every(Boolean)) found.code = t.codeMissing
    if (!password) found.password = STUDIO_COPY.required
    else if (!adminPasswordOk(password)) found.password = STUDIO_COPY.newPassword.weak
    if (!found.password && repeat !== password) found.repeat = STUDIO_COPY.newPassword.mismatch
    setErrors(found)
    const first = found.code ? "studio-reset-code-0" : found.password ? "studio-reset-password" : found.repeat ? "studio-reset-repeat" : null
    if (first) {
      document.getElementById(first)?.focus()
      return
    }
    setBusy(true)
    try {
      await finishPasswordReset(sentTo, code.join(""), password)
      navigate(safeStudioNext(params.get("next")), { replace: true })
    } catch (error) {
      setBusy(false)
      const reason = error instanceof AdminAuthError ? error.code : "unavailable"
      if (reason === "wrong_code") {
        setErrors({ code: t.wrongCode })
        document.getElementById("studio-reset-code-0")?.focus()
      } else if (reason === "expired_code") {
        setExpired(true)
        setErrors({ code: t.expiredCode })
      } else if (reason === "invalid_password" && error instanceof AdminAuthError) setErrors({ form: error.message })
      else setErrors({ form: reason === "too_many_attempts" ? STUDIO_COPY.tooManyAttempts : STUDIO_COPY.unavailable })
    }
  }

  const back = (
    <Link to={studioPath("/sign-in")} className="flex min-h-11 items-center self-center text-sm text-accent underline underline-offset-4">
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
      <StudioAuthFrame title={t.title} intro={t.intro}>
        {params.get("reset") === "required" && (
          <p role="status" className="border-y border-border py-3 text-center text-sm">
            {t.resetRequired}
          </p>
        )}
        <form noValidate onSubmit={send} className="flex flex-col gap-8">
          <Field id="studio-reset-email" label={STUDIO_COPY.email} error={errors.email}>
            {(control) => (
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} {...control} />
            )}
          </Field>
          {formError}
          <button type="submit" disabled={busy} className={submitClass}>
            {busy ? t.sending : t.send}
          </button>
        </form>
        {back}
      </StudioAuthFrame>
    )
  }

  return (
    <StudioAuthFrame title={t.codeTitle} intro={t.sent}>
      <form noValidate onSubmit={save} className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <CodeInput
            idPrefix="studio-reset-code"
            value={code}
            onChange={setCode}
            label={t.code}
            digitLabel={(n) => interpolate(t.digit, { n })}
            invalid={Boolean(errors.code)}
            describedBy={errors.code ? CODE_ERROR_ID : undefined}
          />
          {errors.code && (
            <p id={CODE_ERROR_ID} role="alert" className="text-center text-sm text-destructive">
              {errors.code}
            </p>
          )}
          {expired && (
            <button type="button" disabled={busy} onClick={() => void request(sentTo)} className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4">
              {t.sendAgain}
            </button>
          )}
        </div>
        <Field
          id="studio-reset-password"
          label={STUDIO_COPY.newPassword.password}
          error={errors.password}
          hint={<PasswordChecklist password={password} rules={ADMIN_PASSWORD_RULES} metLabel={STUDIO_COPY.rules.met} notMetLabel={STUDIO_COPY.rules.notMet} />}
        >
          {(control) => (
            <PasswordInput
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showLabel={STUDIO_COPY.show}
              hideLabel={STUDIO_COPY.hide}
              {...control}
            />
          )}
        </Field>
        <Field id="studio-reset-repeat" label={STUDIO_COPY.newPassword.repeat} error={errors.repeat}>
          {(control) => (
            <PasswordInput
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              showLabel={STUDIO_COPY.show}
              hideLabel={STUDIO_COPY.hide}
              {...control}
            />
          )}
        </Field>
        {formError}
        <button type="submit" disabled={busy} className={submitClass}>
          {busy ? t.saving : t.save}
        </button>
        <button type="button" onClick={() => setSentTo(null)} className="-mt-4 inline-flex min-h-11 items-center self-center text-sm underline underline-offset-4">
          {t.otherEmail}
        </button>
      </form>
      {back}
    </StudioAuthFrame>
  )
}
