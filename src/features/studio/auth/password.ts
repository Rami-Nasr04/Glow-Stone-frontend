import { STUDIO_COPY } from "../copy"

// Must equal the admin pool's password policy: at least 12 characters with an uppercase letter, a lowercase letter
// and a number. Cognito checks it again and its own message is shown if it still refuses.
export const ADMIN_PASSWORD_RULES = [
  { key: "length", label: STUDIO_COPY.rules.length, test: (password: string) => password.length >= 12 },
  { key: "uppercase", label: STUDIO_COPY.rules.uppercase, test: (password: string) => /[A-Z]/.test(password) },
  { key: "lowercase", label: STUDIO_COPY.rules.lowercase, test: (password: string) => /[a-z]/.test(password) },
  { key: "number", label: STUDIO_COPY.rules.number, test: (password: string) => /\d/.test(password) },
] as const

export function adminPasswordOk(password: string): boolean {
  return ADMIN_PASSWORD_RULES.every((rule) => rule.test(password))
}
