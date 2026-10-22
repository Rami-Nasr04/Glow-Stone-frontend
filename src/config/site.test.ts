import { instagramDm, instagramProfile, WHATSAPP_NUMBER, whatsappLink } from "./site"

describe("contact links", () => {
  it("keeps Omar's WhatsApp as a number and builds the chat link from it", () => {
    expect(WHATSAPP_NUMBER).toBe("+96171284863")
    expect(whatsappLink(WHATSAPP_NUMBER)).toBe("https://wa.me/96171284863")
  })

  it("puts a ready message in the chat link, encoded so every character arrives", () => {
    const link = whatsappLink(WHATSAPP_NUMBER, "Is Qadisha 118 × 36 cm? 50% & more\n\nRami #2")
    expect(link).toBe("https://wa.me/96171284863?text=Is%20Qadisha%20118%20%C3%97%2036%20cm%3F%2050%25%20%26%20more%0A%0ARami%20%232")
    expect(new URL(link).searchParams.get("text")).toBe("Is Qadisha 118 × 36 cm? 50% & more\n\nRami #2")
  })

  it("builds the Instagram profile and message links from a handle", () => {
    expect(instagramProfile("glowstone.lb")).toBe("https://instagram.com/glowstone.lb")
    expect(instagramDm("glowstone.lb")).toBe("https://ig.me/m/glowstone.lb")
  })
})
