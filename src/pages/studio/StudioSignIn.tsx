import { useRef, useState } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { actionVariants } from "@/components/ui/action-link"
import { Field, inputClass, PasswordInput } from "@/components/ui/field"
import { safeStudioNext, studioPath } from "@/config/studio"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { AdminAuthError } from "@/features/studio/auth/types"
import { STUDIO_COPY } from "@/features/studio/copy"
import StudioAuthFrame from "@/features/studio/StudioAuthFrame"
import { cn } from "@/lib/utils"
import { isEmail } from "@/lib/validation"

type Errors = Partial<Record<"email" | "password" | "form", string>>

const t = STUDIO_COPY.signIn

// Email and password only: there is no sign-up (Omar's account is made in the Cognito console).
export default function StudioSignIn() {
  const { status, sessionEnded, signIn } = useAdminAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get("next")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  if (status === "signedIn" && !busy) return <Navigate replace to={safeStudioNext(next)} />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Errors = {}
    if (!email.trim()) found.email = STUDIO_COPY.required
    else if (!isEmail(email)) found.email = STUDIO_COPY.invalidEmail
    if (!password) found.password = STUDIO_COPY.required
    setErrors(found)
    const first = (["email", "password"] as const).find((key) => found[key])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#studio-signin-${first}`)?.focus()
      return
    }
    setBusy(true)
    try {
      const result = await signIn(email.trim(), password)
      if (result.status === "newPasswordRequired") {
        navigate(`${studioPath("/sign-in/new-password")}${next ? `?next=${encodeURIComponent(next)}` : ""}`)
        return
      }
      navigate(safeStudioNext(next), { replace: true })
    } catch (error) {
      setBusy(false)
      const code = error instanceof AdminAuthError ? error.code : "unavailable"
      if (code === "reset_required") {
        navigate(`${studioPath("/forgot-password")}?email=${encodeURIComponent(email.trim())}&reset=required`)
        return
      }
      setErrors({
        form: code === "wrong_credentials" ? t.wrongCredentials : code === "too_many_attempts" ? STUDIO_COPY.tooManyAttempts : STUDIO_COPY.unavailable,
      })
    }
  }

  return (
    <StudioAuthFrame title={t.title} intro={t.intro}>
      {sessionEnded && (
        <p role="status" className="border-y border-border py-3 text-center text-sm">
          {t.sessionEnded}
        </p>
      )}
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-8">
        <Field id="studio-signin-email" label={STUDIO_COPY.email} error={errors.email}>
          {(control) => (
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} {...control} />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <Field id="studio-signin-password" label={STUDIO_COPY.password} error={errors.password}>
            {(control) => (
              <PasswordInput
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showLabel={STUDIO_COPY.show}
                hideLabel={STUDIO_COPY.hide}
                {...control}
              />
            )}
          </Field>
          <Link to={studioPath("/forgot-password")} className="flex min-h-11 items-center self-end text-sm underline underline-offset-4">
            {t.forgot}
          </Link>
        </div>
        {errors.form && (
          <p role="alert" className="text-sm text-destructive">
            {errors.form}
          </p>
        )}
        <button type="submit" disabled={busy} className={cn(actionVariants({ variant: "solid", size: "lg" }), "w-full disabled:opacity-60")}>
          {busy ? t.submitting : t.submit}
        </button>
      </form>
    </StudioAuthFrame>
  )
}
