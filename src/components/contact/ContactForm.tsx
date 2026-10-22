import { MoveRight } from "lucide-react"
import { useRef, useState } from "react"
import { actionVariants } from "@/components/ui/action-link"
import { Field, inputClass } from "@/components/ui/field"
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, instagramDm, WHATSAPP_NUMBER, whatsappLink } from "@/config/site"
import SpamTrap from "@/features/news/SpamTrap"
import { subscribe } from "@/features/news/subscribe"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { mailtoFor, messageText, validateContact, type ContactFields, type FieldErrors } from "./contact-message"

/** How the form hands the message over: a new tab, this tab (mailto), and the clipboard. */
export interface Opener {
  newTab: (url: string) => void
  sameTab: (url: string) => void
  copy: (text: string) => Promise<void>
}

interface ContactFormProps {
  /** Null hides the Instagram button. */
  instagramHandle?: string | null
  opener?: Opener
}

type Channel = "whatsapp" | "email" | "instagram"
type Notice = "whatsapp" | "email" | "copied" | "copyByHand"

const EMPTY: ContactFields = { name: "", email: "", phone: "", message: "" }
// The text travels in a link (wa.me, mailto), so keep it to a size every app accepts.
const MESSAGE_MAX = 4000
const ORDER: (keyof ContactFields)[] = ["name", "email", "phone", "message"]
// The news list call must never hold the visitor up; it runs alongside and is dropped after this.
const SUBSCRIBE_TIMEOUT_MS = 5000

const browser: Opener = {
  newTab: (url) => {
    const tab = window.open(url, "_blank")
    if (tab) tab.opener = null
    // A blocked pop-up still gets the visitor there, in this tab.
    else window.location.assign(url)
  },
  sameTab: (url) => window.location.assign(url),
  copy: (text) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error("No clipboard"))),
}

const arrow = <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />

export default function ContactForm({ instagramHandle = INSTAGRAM_HANDLE, opener = browser }: ContactFormProps) {
  const { m } = useLocale()
  const [fields, setFields] = useState(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState<Notice | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const trapRef = useRef<HTMLInputElement>(null)

  // Everything up to opening the app runs in the same tap: phones block a pop-up that comes after an await.
  const send = (channel: Channel) => {
    const found = validateContact(fields, m)
    setErrors(found)
    const first = ORDER.find((key) => found[key])
    if (first) {
      setNotice(null)
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    // The email joins the news list quietly first (never re-subscribing someone who left); the answer is ignored.
    void subscribe({ email: fields.email.trim(), rejoin: false, website: trapRef.current?.value ?? "" }, { timeoutMs: SUBSCRIBE_TIMEOUT_MS })
    const text = messageText(fields)
    if (channel === "whatsapp") {
      opener.newTab(whatsappLink(WHATSAPP_NUMBER, text))
      setNotice("whatsapp")
    } else if (channel === "email") {
      opener.sameTab(mailtoFor(fields, CONTACT_EMAIL, m))
      setNotice("email")
    } else if (instagramHandle) {
      // Instagram can't fill in a message: copy it, then open the chat.
      const copied = opener.copy(text)
      opener.newTab(instagramDm(instagramHandle))
      copied.then(
        () => setNotice("copied"),
        () => setNotice("copyByHand"),
      )
    }
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

  const notices: Record<Notice, string> = {
    whatsapp: m.contact.openedWhatsApp,
    email: interpolate(m.contact.openedEmail, { email: CONTACT_EMAIL }),
    copied: m.contact.copied,
    copyByHand: m.contact.copyByHand,
  }

  return (
    <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()} className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2">
      {field("name", m.contact.name, (props) => <input type="text" autoComplete="name" {...props} />)}
      {field("email", m.contact.email, (props) => <input type="email" autoComplete="email" {...props} />)}
      {field(
        "phone",
        m.contact.phone,
        ({ className, ...props }) => (
          <div className="flex items-stretch gap-4">
            <span className="flex items-center border-b border-primary/40 pt-1.5 pb-3 text-base text-muted-foreground">{m.auth.countryCode}</span>
            <input type="tel" inputMode="tel" autoComplete="tel-national" placeholder={m.auth.phonePlaceholder} className={cn(className, "flex-1")} {...props} />
          </div>
        ),
        true,
      )}
      {field("message", m.contact.message, (props) => <textarea rows={5} maxLength={MESSAGE_MAX} {...props} />, true)}
      <SpamTrap ref={trapRef} />

      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={() => send("whatsapp")} className={actionVariants({ variant: "solid", size: "lg" })}>
          {m.contact.sendWhatsApp}
          {arrow}
        </button>
        <button type="button" onClick={() => send("email")} className={actionVariants({ variant: "outline", size: "lg" })}>
          {m.contact.sendEmail}
          {arrow}
        </button>
        {instagramHandle && (
          <button type="button" onClick={() => send("instagram")} className={actionVariants({ variant: "outline", size: "lg" })}>
            {m.contact.sendInstagram}
            {arrow}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:col-span-2">
        <p role="status" className="text-small text-pretty text-muted-foreground empty:hidden">
          {notice && notices[notice]}
        </p>
        {notice === "copyByHand" && (
          <Field id="contact-copy" label={m.contact.yourMessage}>
            {(control) => (
              <textarea {...control} readOnly rows={6} value={messageText(fields)} onFocus={(e) => e.currentTarget.select()} className={cn(inputClass, "select-all")} />
            )}
          </Field>
        )}
      </div>
    </form>
  )
}
