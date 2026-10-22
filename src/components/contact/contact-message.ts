import { internationalPhone, lebanesePhone } from "@/features/auth/rules"
import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"
import { isEmail } from "@/lib/validation"

export interface ContactFields {
  name: string
  email: string
  phone: string
  message: string
}

export type FieldErrors = Partial<Record<keyof ContactFields, string>>

// Every field is required; the phone follows the sign-up's rule (a Lebanese number).
export function validateContact(fields: ContactFields, m: Messages): FieldErrors {
  const errors: FieldErrors = {}
  if (!fields.name.trim()) errors.name = m.contact.required
  if (!fields.email.trim()) errors.email = m.contact.required
  else if (!isEmail(fields.email)) errors.email = m.contact.invalidEmail
  if (!fields.phone.trim()) errors.phone = m.contact.required
  else if (!lebanesePhone(fields.phone)) errors.phone = m.auth.invalidPhone
  if (!fields.message.trim()) errors.message = m.contact.required
  return errors
}

// The text Omar receives, the same on every channel: the question, then the visitor's name, email and phone.
export function messageText(fields: ContactFields): string {
  const phone = lebanesePhone(fields.phone)
  const signature = [fields.name.trim(), fields.email.trim(), phone ? internationalPhone(phone) : fields.phone.trim()]
  return `${fields.message.trim()}\n\n${signature.join("\n")}`
}

// There is no message route on the server: the email goes out through the visitor's own mail app.
export function mailtoFor(fields: ContactFields, to: string, m: Messages): string {
  const subject = interpolate(m.contact.subject, { name: fields.name.trim() })
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText(fields))}`
}
