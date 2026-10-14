import { requireUrl } from "./env"

describe("requireUrl", () => {
  it("refuses a missing or non-http(s) address, and trims a trailing slash", () => {
    expect(() => requireUrl("VITE_SITE_URL", undefined)).toThrow("VITE_SITE_URL is not set")
    expect(() => requireUrl("VITE_SITE_URL", " ")).toThrow("VITE_SITE_URL is not set")
    expect(() => requireUrl("VITE_SITE_URL", "localhost:4173")).toThrow("VITE_SITE_URL must be an http(s) address")
    expect(requireUrl("VITE_SITE_URL", " http://localhost:4173/ ")).toBe("http://localhost:4173")
  })
})
