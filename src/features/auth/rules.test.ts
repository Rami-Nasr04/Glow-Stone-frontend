import { displayPhone, lebanesePhone, passwordOk, PASSWORD_RULES } from "./rules"

describe("password rules", () => {
  it("needs 8 characters, a number and an uppercase letter", () => {
    expect(PASSWORD_RULES.map((r) => r.key)).toEqual(["length", "number", "uppercase"])
    expect(passwordOk("Stone2026")).toBe(true)
    expect(passwordOk("stone2026")).toBe(false)
    expect(passwordOk("Stone")).toBe(false)
    expect(passwordOk("Stonemason")).toBe(false)
  })
})

describe("lebanesePhone", () => {
  it.each([
    ["71 234 567", "+96171234567"],
    ["03 123 456", "+9613123456"],
    ["+961 71 234 567", "+96171234567"],
    ["00961-3-123456", "+9613123456"],
  ])("normalises %s", (input, e164) => {
    expect(lebanesePhone(input)).toBe(e164)
  })

  it.each(["", "1234", "71a23456", "961712345678"])("rejects %s", (input) => {
    expect(lebanesePhone(input)).toBeNull()
  })

  it("shows numbers the way people write them", () => {
    expect(displayPhone("+96171234567")).toBe("71 234 567")
    expect(displayPhone("+9613123456")).toBe("3 123 456")
  })
})
