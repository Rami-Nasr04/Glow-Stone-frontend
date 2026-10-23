// Must equal the customer pool's password policy: 8+ characters, a number, a capital letter.
export const PASSWORD_RULES = [
  { key: "length", test: (password: string) => password.length >= 8 },
  { key: "number", test: (password: string) => /\d/.test(password) },
  { key: "uppercase", test: (password: string) => /[A-Z]/.test(password) },
] as const

export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]["key"]

export function passwordOk(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}

const COUNTRY = "+961"
const INTERNATIONAL = "00961"

// Lebanese numbers without the leading 0: 7 digits (3 123 456, 1 234 567) or 8 digits (71 234 567, 81 234 567).
export function lebanesePhone(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "")
  if (digits.startsWith(COUNTRY)) digits = digits.slice(COUNTRY.length)
  else if (digits.startsWith(INTERNATIONAL)) digits = digits.slice(INTERNATIONAL.length)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return /^\d{7,8}$/.test(digits) ? `${COUNTRY}${digits}` : null
}

export function displayPhone(e164: string): string {
  const digits = e164.startsWith(COUNTRY) ? e164.slice(COUNTRY.length) : e164
  const head = digits.length === 8 ? 2 : 1
  return `${digits.slice(0, head)} ${digits.slice(head, head + 3)} ${digits.slice(head + 3)}`
}

/** "+961 71 234 567", for text a person reads. */
export function internationalPhone(e164: string): string {
  return `${COUNTRY} ${displayPhone(e164)}`
}
