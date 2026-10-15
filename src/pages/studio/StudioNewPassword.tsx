import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { actionVariants } from "@/components/ui/action-link"
import { Field, PasswordInput } from "@/components/ui/field"
import { safeStudioNext, studioPath } from "@/config/studio"
import PasswordRules from "@/features/auth/PasswordRules"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { ADMIN_PASSWORD_RULES, adminPasswordOk } from "@/features/studio/auth/password"
import { AdminAuthError } from "@/features/studio/auth/types"
import { STUDIO_COPY } from "@/features/studio/copy"
import StudioAuthFrame from "@/features/studio/StudioAuthFrame"
import { cn } from "@/lib/utils"

type Errors = Partial<Record<"password" | "repeat" | "form", string>>

const t = STUDIO_COPY.newPassword

// The first sign-in with Cognito's temporary password: the admin chooses their own (C.2).
export default function StudioNewPassword() {
  const { completeNewPassword } = useAdminAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [password, setPassword] = useState("")
  const [repeat, setRepeat] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Errors = {}
    if (!password) found.password = STUDIO_COPY.required
    else if (!adminPasswordOk(password)) found.password = t.weak
    if (!found.password && repeat !== password) found.repeat = t.mismatch
    setErrors(found)
    if (found.password || found.repeat) {
      document.getElementById(found.password ? "studio-new-password" : "studio-new-password-repeat")?.focus()
      return
    }
    setBusy(true)
    try {
      await completeNewPassword(password)
      navigate(safeStudioNext(params.get("next")), { replace: true })
    } catch (error) {
      setBusy(false)
      const code = error instanceof AdminAuthError ? error.code : "unavailable"
      if (code === "challenge_expired") setExpired(true)
      setErrors({
        form:
          code === "challenge_expired"
            ? t.expired
            : code === "invalid_password" && error instanceof AdminAuthError
              ? error.message
              : code === "too_many_attempts"
                ? STUDIO_COPY.tooManyAttempts
                : STUDIO_COPY.unavailable,
      })
    }
  }

  return (
    <StudioAuthFrame title={t.title} intro={t.intro}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-8">
        <Field
          id="studio-new-password"
          label={t.password}
          error={errors.password}
          hint={<PasswordRules password={password} rules={ADMIN_PASSWORD_RULES} />}
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
        <Field id="studio-new-password-repeat" label={t.repeat} error={errors.repeat}>
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
        {errors.form && (
          <p role="alert" className="text-sm text-destructive">
            {errors.form}
          </p>
        )}
        <button type="submit" disabled={busy || expired} className={cn(actionVariants({ variant: "solid", size: "lg" }), "w-full disabled:opacity-60")}>
          {busy ? t.submitting : t.submit}
        </button>
      </form>
      <Link to={studioPath("/sign-in")} className="flex min-h-11 items-center self-center text-sm text-accent underline underline-offset-4">
        {t.backToSignIn}
      </Link>
    </StudioAuthFrame>
  )
}
