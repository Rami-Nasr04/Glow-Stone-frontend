// Route modules export `handle`; the locale layout reads it.
export interface RouteHandle {
  /** Full-screen page without the site header and footer (sign in, create an account, verify, reset). */
  bare?: boolean
}
