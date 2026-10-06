import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import Contact from "./Contact"

const site = vi.hoisted(() => ({ whatsapp: null as string | null }))
vi.mock("@/config/site", async (original) => ({
  ...(await original<typeof import("@/config/site")>()),
  get WHATSAPP_URL() {
    return site.whatsapp
  },
}))

describe("Contact", () => {
  afterEach(() => {
    site.whatsapp = null
  })

  it("has one h1, the form, and the email set in the sans face", () => {
    renderAt(<Contact />, "/contact")
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Contact"])
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument()
    const email = screen.getByRole("link", { name: "glowstone216@gmail.com" })
    expect(email).toHaveAttribute("href", "mailto:glowstone216@gmail.com")
    expect(email).toHaveClass("font-sans")
    expect(screen.getByText("For bespoke pieces or commissions, write to us.")).toBeInTheDocument()
  })

  it("hides WhatsApp until a number is set", () => {
    renderAt(<Contact />, "/contact")
    expect(screen.queryByRole("link", { name: /Chat on WhatsApp/ })).not.toBeInTheDocument()
  })

  it("puts WhatsApp before the form on phones once a number is set", () => {
    site.whatsapp = "https://wa.me/96100000000"
    const { container } = renderAt(<Contact />, "/contact")
    const links = screen.getAllByRole("link", { name: /Chat on WhatsApp/ })
    expect(links).toHaveLength(2)
    const form = container.querySelector("form")!
    expect(links[0].compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(links[0].closest(".md\\:hidden")).not.toBeNull()
  })
})
