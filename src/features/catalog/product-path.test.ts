import { parseProductId, productPath, readableName } from "./product-path"

describe("product addresses", () => {
  it.each([
    ["Sannine · Sand", "sannine-sand"],
    ["Qadisha · Earth", "qadisha-earth"],
    ["Batroun", "batroun"],
    ["  Café  Noir!  ", "cafe-noir"],
  ])("makes %s readable as %s", (name, readable) => {
    expect(readableName(name)).toBe(readable)
  })

  it("puts the id first, then the readable name", () => {
    expect(productPath({ id: 8, name: "Sannine · Sand" })).toBe("/collection/8/sannine-sand")
  })

  it("reads only whole positive ids from the address", () => {
    expect(parseProductId("3")).toBe(3)
    for (const raw of [undefined, "", "0", "03", "3.5", "-3", "abc", "3abc", "9999999999"]) expect(parseProductId(raw)).toBeNull()
  })
})
