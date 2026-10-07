import { safeNext } from "./next-path"

describe("safeNext", () => {
  it.each(["/checkout", "/account/addresses", "/ar/account?tab=1"])("keeps the site path %s", (path) => {
    expect(safeNext(path, "/account")).toBe(path)
  })

  // Browsers drop tabs and newlines and read "\" as "/", so these become "//evil.com" too.
  it.each([null, "", "checkout", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/\t/evil.com", "/\n/evil.com", "\\/evil.com"])(
    "falls back for %s",
    (raw) => {
      expect(safeNext(raw, "/account")).toBe("/account")
    },
  )
})
