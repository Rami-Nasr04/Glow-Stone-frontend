import { requireClientId, requireFlag, requirePoolId, requireUrl } from "./env"

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

describe("requirePoolId and requireClientId", () => {
  it("reads a Cognito user pool id: <region>_<id>", () => {
    expect(requirePoolId("VITE_ADMIN_USER_POOL_ID", " eu-central-1_6FRkxadSl ")).toBe("eu-central-1_6FRkxadSl")
    expect(() => requirePoolId("VITE_ADMIN_USER_POOL_ID", undefined)).toThrow("VITE_ADMIN_USER_POOL_ID is not set.")
    expect(() => requirePoolId("VITE_ADMIN_USER_POOL_ID", "")).toThrow("VITE_ADMIN_USER_POOL_ID is not set.")
    for (const value of ["6FRkxadSl", "eu-central-1-6FRkxadSl", "https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_6FRkxadSl"]) {
      expect(() => requirePoolId("VITE_ADMIN_USER_POOL_ID", value)).toThrow("VITE_ADMIN_USER_POOL_ID must look like eu-central-1_AbC123.")
    }
  })

  it("reads an app client id", () => {
    expect(requireClientId("VITE_ADMIN_APP_CLIENT_ID", "5e8evgm2689ve3vg4upi7nt8t9")).toBe("5e8evgm2689ve3vg4upi7nt8t9")
    expect(() => requireClientId("VITE_ADMIN_APP_CLIENT_ID", undefined)).toThrow("VITE_ADMIN_APP_CLIENT_ID is not set.")
    for (const value of ["has space", "eu-central-1_6FRkxadSl", "x".repeat(129)]) {
      expect(() => requireClientId("VITE_ADMIN_APP_CLIENT_ID", value)).toThrow("VITE_ADMIN_APP_CLIENT_ID must be an app client id.")
    }
  })
})
