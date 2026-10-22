import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import Contact from "./Contact"

const site = vi.hoisted(() => ({ instagram: null as string | null }))
vi.mock("@/config/site", async (original) => ({
  ...(await original<typeof import("@/config/site")>()),
  get INSTAGRAM_HANDLE() {
    return site.instagram
  },
}))

describe("Contact", () => {
  afterEach(() => {
    site.instagram = null
  })

  it("has one h1, the form, and the email set in the sans face", () => {
    renderAt(<Contact />, "/contact")
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Contact"])
    expect(screen.getByRole("button", { name: "Send on WhatsApp" })).toBeInTheDocument()
    const email = screen.getByRole("link", { name: "glowstone216@gmail.com" })
    expect(email).toHaveAttribute("href", "mailto:glowstone216@gmail.com")
    expect(email).toHaveClass("font-sans")
    expect(screen.getByText("For bespoke pieces or commissions, write to us.")).toBeInTheDocument()
  })

  it("links Omar's WhatsApp, before the form on phones and beside it on wider screens", () => {
    const { container } = renderAt(<Contact />, "/contact")
    const links = screen.getAllByRole("link", { name: /Chat on WhatsApp/ })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).toHaveAttribute("href", "https://wa.me/96171284863")
    const form = container.querySelector("form")!
    expect(links[0].compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(links[0].closest(".md\\:hidden")).not.toBeNull()
  })

  it("hides Instagram until its handle is set", () => {
    renderAt(<Contact />, "/contact")
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Send on Instagram" })).not.toBeInTheDocument()
  })

  it("links the Instagram profile and offers the Instagram button once the handle is set", () => {
    site.instagram = "glowstone.test"
    renderAt(<Contact />, "/contact")
    expect(screen.getByRole("link", { name: "From the workshop" })).toHaveAttribute("href", "https://instagram.com/glowstone.test")
    expect(screen.getByRole("button", { name: "Send on Instagram" })).toBeInTheDocument()
  })
})
