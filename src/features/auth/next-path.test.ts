import { safeNext } from "./next-path"

describe("safeNext", () => {
  it.each(["/checkout", "/account/addresses", "/ar/account?tab=1"])("keeps the site path %s", (path) => {
    expect(safeNext(path, "/account")).toBe(path)
  })

  it.each([null, "", "checkout", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)"])(
    "falls back for %s",
    (raw) => {
      expect(safeNext(raw, "/account")).toBe("/account")
    },
  )
})
