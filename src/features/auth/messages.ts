import type { Messages } from "@/i18n/messages/en"
import { AuthError } from "./types"

// The words for a failed step, shown at the top of the form or under the code. Each page keeps the failures it shows
// next to a field (a taken email, a wrong password) and asks this for the rest.
export function authFailureText(failure: unknown, m: Messages): string {
  if (!(failure instanceof AuthError)) return m.auth.unavailable
  switch (failure.code) {
    // The pool's own words (pre-sign-up check), English only for now.
    case "rejected":
      return failure.message
    case "too_many_attempts":
      return m.auth.tooManyAttempts
    case "network":
      return m.auth.network
    case "wrong_code":
      return m.auth.verify.wrongCode
    case "expired_code":
      return m.auth.expiredCode
    default:
      return m.auth.unavailable
  }
}
