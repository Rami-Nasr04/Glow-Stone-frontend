import { useRef, useState } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { actionVariants } from "@/components/ui/action-link"
import { Field, inputClass, PasswordInput } from "@/components/ui/field"
import { useAuth } from "@/features/auth/auth-context"
import AuthFrame from "@/features/auth/AuthFrame"
import { AFTER_SIGN_IN, safeNext } from "@/features/auth/next-path"
import { authFailureText } from "@/features/auth/messages"
import { rememberPendingPassword } from "@/features/auth/pending-password"
import { AuthError } from "@/features/auth/types"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { isEmail } from "@/lib/validation"

type Errors = Partial<Record<"email" | "password" | "form", string>>

export default function SignIn() {
  const { m, to } = useLocale()
  const { signIn, client, status } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get("next")
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : ""
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const t = m.auth.signIn

  // Already signed in (in another tab, or coming back to this address): nothing to do here. While this page is signing
  // in, its own navigate leads on, after the welcome toast.
  if (status === "signedIn" && !busy) return <Navigate replace to={safeNext(next, to(AFTER_SIGN_IN))} />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Errors = {}
    if (!email.trim()) found.email = m.auth.required
    else if (!isEmail(email)) found.email = m.auth.invalidEmail
    if (!password) found.password = m.auth.required
    setErrors(found)
    const first = (["email", "password"] as const).find((key) => found[key])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#signin-${first}`)?.focus()
      return
    }
    setBusy(true)
    try {
      const user = await signIn(email.trim(), password)
      toast.success(interpolate(t.welcome, { name: user.name.split(" ")[0] }))
      navigate(safeNext(next, to(AFTER_SIGN_IN)), { replace: true })
    } catch (error) {
      setBusy(false)
      const code = error instanceof AuthError ? error.code : "unavailable"
      if (code === "not_confirmed") {
        // Verifying signs them straight in, so they don't type the password twice.
        rememberPendingPassword(email, password)
        await client.resendCode(email.trim()).catch(() => undefined)
        navigate(`${to("/verify")}?email=${encodeURIComponent(email.trim())}${next ? `&next=${encodeURIComponent(next)}` : ""}`)
        return
      }
      if (code === "wrong_credentials") setErrors({ password: t.wrongCredentials })
      else setErrors({ form: authFailureText(error, m) })
    }
  }

  return (
    <AuthFrame title={t.title} intro={t.intro}>
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-8">
        <Field id="signin-email" label={m.auth.email} error={errors.email}>
          {(control) => (
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} {...control} />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <Field id="signin-password" label={m.auth.password} error={errors.password} announce={errors.password === t.wrongCredentials}>
            {(control) => (
              <PasswordInput
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showLabel={m.auth.show}
                hideLabel={m.auth.hide}
                {...control}
              />
            )}
          </Field>
          <Link to={to("/forgot-password")} className="flex min-h-11 items-center self-end text-sm underline underline-offset-4">
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
      <p className="text-center text-sm text-muted-foreground">
        {t.newHere}{" "}
        <Link to={`${to("/sign-up")}${nextQuery}`} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
          {t.createAccount}
        </Link>
      </p>
    </AuthFrame>
  )
}
