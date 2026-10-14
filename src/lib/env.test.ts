import { requireFlag, requireUrl } from "./env"

describe("requireUrl", () => {
  it("refuses a missing or non-http(s) address, and trims a trailing slash", () => {
    expect(() => requireUrl("VITE_SITE_URL", undefined)).toThrow("VITE_SITE_URL is not set")
    expect(() => requireUrl("VITE_SITE_URL", " ")).toThrow("VITE_SITE_URL is not set")
    expect(() => requireUrl("VITE_SITE_URL", "localhost:4173")).toThrow("VITE_SITE_URL must be an http(s) address")
    expect(requireUrl("VITE_SITE_URL", " http://localhost:4173/ ")).toBe("http://localhost:4173")
  })
})

describe("requireFlag", () => {
  it("reads exactly true or false, with no default", () => {
    expect(requireFlag("VITE_ALLOW_INDEXING", "true")).toBe(true)
    expect(requireFlag("VITE_ALLOW_INDEXING", "false")).toBe(false)
    expect(() => requireFlag("VITE_ALLOW_INDEXING", undefined)).toThrow("VITE_ALLOW_INDEXING is not set.")
    expect(() => requireFlag("VITE_ALLOW_INDEXING", "")).toThrow("VITE_ALLOW_INDEXING is not set.")
    for (const value of ["yes", "1", "TRUE", " false"]) {
      expect(() => requireFlag("VITE_ALLOW_INDEXING", value)).toThrow('VITE_ALLOW_INDEXING must be "true" or "false".')
    }
  })
})
