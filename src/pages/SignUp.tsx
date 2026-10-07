import { useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { actionVariants } from "@/components/ui/action-link"
import { Field, inputClass, PasswordInput } from "@/components/ui/field"
import { useAuth } from "@/features/auth/auth-context"
import AuthFrame from "@/features/auth/AuthFrame"
import PasswordRules from "@/features/auth/PasswordRules"
import { rememberPendingPassword } from "@/features/auth/pending-password"
import { lebanesePhone, passwordOk } from "@/features/auth/rules"
import { AuthError } from "@/features/auth/types"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { isEmail } from "@/lib/validation"

type Key = "name" | "email" | "phone" | "password"
type Errors = Partial<Record<Key | "form", string>>
const ORDER: Key[] = ["name", "email", "phone", "password"]

export default function SignUp() {
  const { m, to } = useLocale()
  const { client } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get("next")
  const [fields, setFields] = useState<Record<Key, string>>({ name: "", email: "", phone: "", password: "" })
  const [errors, setErrors] = useState<Errors>({})
  const [emailTaken, setEmailTaken] = useState(false)
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const t = m.auth.signUp

  const set = (key: Key) => (e: React.ChangeEvent<HTMLInputElement>) => setFields({ ...fields, [key]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Errors = {}
    const phone = lebanesePhone(fields.phone)
    if (!fields.name.trim()) found.name = m.auth.required
    if (!fields.email.trim()) found.email = m.auth.required
    else if (!isEmail(fields.email)) found.email = m.auth.invalidEmail
    if (!fields.phone.trim()) found.phone = m.auth.required
    else if (!phone) found.phone = m.auth.invalidPhone
    if (!fields.password) found.password = m.auth.required
    else if (!passwordOk(fields.password)) found.password = t.weakPassword
    setErrors(found)
    setEmailTaken(false)
    const first = ORDER.find((key) => found[key])
    if (first || !phone) {
      formRef.current?.querySelector<HTMLElement>(`#signup-${first}`)?.focus()
      return
    }
    const email = fields.email.trim().toLowerCase()
    setBusy(true)
    try {
      await client.signUp({ name: fields.name.trim(), email, phone, password: fields.password })
      const nextParam = next ? `&next=${encodeURIComponent(next)}` : ""
      // Held in memory for the verify step, so the new customer is signed in straight after verifying.
      rememberPendingPassword(email, fields.password)
      navigate(`${to("/verify")}?email=${encodeURIComponent(email)}${nextParam}`)
    } catch (error) {
      setBusy(false)
      const code = error instanceof AuthError ? error.code : "unavailable"
      if (code === "email_taken") {
        setErrors({ email: t.emailTaken })
        setEmailTaken(true)
      } else setErrors({ form: code === "too_many_attempts" ? m.auth.tooManyAttempts : m.auth.unavailable })
    }
  }

  return (
    <AuthFrame title={t.title} intro={t.intro}>
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-8">
        <Field id="signup-name" label={m.auth.fullName} error={errors.name}>
          {(control) => <input type="text" autoComplete="name" value={fields.name} onChange={set("name")} className={inputClass} {...control} />}
        </Field>
        <div className="flex flex-col gap-1">
          <Field id="signup-email" label={m.auth.email} error={errors.email} announce={emailTaken}>
            {(control) => <input type="email" autoComplete="email" value={fields.email} onChange={set("email")} className={inputClass} {...control} />}
          </Field>
          {emailTaken && (
            <Link
              to={`${to("/sign-in")}?email=${encodeURIComponent(fields.email.trim().toLowerCase())}`}
              className="flex min-h-11 w-max items-center text-sm text-accent underline underline-offset-4"
            >
              {t.signInInstead}
            </Link>
          )}
        </div>
        <Field id="signup-phone" label={m.auth.phone} error={errors.phone}>
          {(control) => (
            <div className="flex items-stretch gap-4">
              <span className="flex items-center border-b border-primary/40 pt-1.5 pb-3 text-base text-muted-foreground">{m.auth.countryCode}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={m.auth.phonePlaceholder}
                value={fields.phone}
                onChange={set("phone")}
                className={cn(inputClass, "flex-1")}
                {...control}
              />
            </div>
          )}
        </Field>
        <Field id="signup-password" label={m.auth.password} error={errors.password} hint={<PasswordRules password={fields.password} />}>
          {(control) => (
            <PasswordInput
              autoComplete="new-password"
              value={fields.password}
              onChange={set("password")}
              showLabel={m.auth.show}
              hideLabel={m.auth.hide}
              {...control}
            />
          )}
        </Field>
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
        {t.haveAccount}{" "}
        <Link to={`${to("/sign-in")}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
          {t.signIn}
        </Link>
      </p>
    </AuthFrame>
  )
}
