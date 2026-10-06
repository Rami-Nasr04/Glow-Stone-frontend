import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"

export interface ContactFields {
  name: string
  email: string
  phone: string
  message: string
}

export type FieldErrors = Partial<Record<keyof ContactFields, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(fields: ContactFields, m: Messages): FieldErrors {
  const errors: FieldErrors = {}
  if (!fields.name.trim()) errors.name = m.contact.required
  if (!fields.email.trim()) errors.email = m.contact.required
  else if (!EMAIL.test(fields.email.trim())) errors.email = m.contact.invalidEmail
  if (!fields.message.trim()) errors.message = m.contact.required
  return errors
}

// Until POST /contact exists (B7), the message goes out through the visitor's own mail app.
export function mailtoFor(fields: ContactFields, to: string, m: Messages): string {
  const subject = interpolate(m.contact.subject, { name: fields.name.trim() })
  const signature = [fields.name, fields.email, fields.phone].map((part) => part.trim()).filter(Boolean)
  const body = `${fields.message.trim()}\n\n${signature.join("\n")}`
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
