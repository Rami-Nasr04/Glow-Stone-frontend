// Create an account → verify the email → signed in, without typing the password twice. The password is held in
// memory only (never in the URL or the browser's history state) and handed over once; a reload simply forgets it
// and the verify step falls back to the sign-in page.
let pending: { email: string; password: string } | null = null

export function rememberPendingPassword(email: string, password: string) {
  pending = { email: email.trim().toLowerCase(), password }
}

export function takePendingPassword(email: string): string | null {
  const match = pending?.email === email.trim().toLowerCase() ? pending.password : null
  pending = null
  return match
}
