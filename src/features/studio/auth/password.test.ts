import { ADMIN_PASSWORD_RULES, adminPasswordOk } from "./password"

describe("the admin pool's password policy", () => {
  it("wants at least 12 characters with an uppercase letter, a lowercase letter and a number", () => {
    expect(adminPasswordOk("Limestone-2026")).toBe(true)
    expect(adminPasswordOk("Limestone26")).toBe(false)
    expect(adminPasswordOk("limestone-2026")).toBe(false)
    expect(adminPasswordOk("LIMESTONE-2026")).toBe(false)
    expect(adminPasswordOk("Limestone-two")).toBe(false)
    expect(ADMIN_PASSWORD_RULES.map((rule) => rule.key)).toEqual(["length", "uppercase", "lowercase", "number"])
  })
})
