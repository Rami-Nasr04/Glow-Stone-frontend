import { MoveRight } from "lucide-react"
import { useRef, useState } from "react"
import { actionVariants } from "@/components/ui/action-link"
import { Field, inputClass } from "@/components/ui/field"
import { CONTACT_EMAIL } from "@/config/site"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { mailtoFor, validateContact, type ContactFields, type FieldErrors } from "./contact-message"

interface ContactFormProps {
  /** Opens the visitor's mail app; replaced by POST /contact in phase B7. */
  onSend?: (mailto: string) => void
}

const EMPTY: ContactFields = { name: "", email: "", phone: "", message: "" }
// Same limit as contact_messages.message in the database.
const MESSAGE_MAX = 4000
const ORDER: (keyof ContactFields)[] = ["name", "email", "phone", "message"]

const openMailApp = (mailto: string) => window.location.assign(mailto)

export default function ContactForm({ onSend = openMailApp }: ContactFormProps) {
  const { m } = useLocale()
  const [fields, setFields] = useState(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [sent, setSent] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const found = validateContact(fields, m)
    setErrors(found)
    const first = ORDER.find((key) => found[key])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    onSend(mailtoFor(fields, CONTACT_EMAIL, m))
    setSent(true)
  }

  if (sent) {
    return (
      <div role="status" className="mt-8 flex flex-col gap-3 border-y border-border py-10">
        <p className="font-display text-lead font-light">{m.contact.sentTitle}</p>
        <p className="text-small text-muted-foreground">{m.contact.sentBody}</p>
      </div>
    )
  }

  const field = (key: keyof ContactFields, label: string, input: (control: React.InputHTMLAttributes<HTMLElement>) => React.ReactElement, wide = false) => (
    <Field id={`contact-${key}`} label={label} error={errors[key]} className={cn(wide && "sm:col-span-2")}>
      {(control) =>
        input({
          ...control,
          name: key,
          value: fields[key],
          onChange: (e: React.ChangeEvent<HTMLElement>) => setFields({ ...fields, [key]: (e.target as HTMLInputElement).value }),
          className: inputClass,
        })
      }
    </Field>
  )

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2">
      {field("name", m.contact.name, (props) => <input type="text" autoComplete="name" {...props} />)}
      {field("email", m.contact.email, (props) => <input type="email" autoComplete="email" {...props} />)}
      {field("phone", m.contact.phone, (props) => <input type="tel" autoComplete="tel" placeholder="+961" {...props} />, true)}
      {field("message", m.contact.message, (props) => <textarea rows={5} maxLength={MESSAGE_MAX} {...props} />, true)}
      <div className="sm:col-span-2">
        <button type="submit" className={actionVariants({ variant: "solid", size: "lg" })}>
          {m.contact.send}
          <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />
        </button>
      </div>
    </form>
  )
}
