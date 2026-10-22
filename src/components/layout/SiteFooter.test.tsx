import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import SiteFooter from "./SiteFooter"

const site = vi.hoisted(() => ({ instagram: null as string | null }))
vi.mock("@/config/site", async (original) => ({
  ...(await original<typeof import("@/config/site")>()),
  get INSTAGRAM_HANDLE() {
    return site.instagram
  },
}))

afterEach(() => {
  site.instagram = null
})

function renderFooter() {
  const Stub = createRoutesStub([{ path: "/:lang?/*", Component: () => <SiteFooter /> }])
  render(<Stub initialEntries={["/"]} />)
}

describe("SiteFooter", () => {
  it("links the legal pages and labels the signup field", () => {
    renderFooter()
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms")
    expect(screen.getByRole("link", { name: "Delivery & Returns" })).toHaveAttribute("href", "/legal/delivery")
    expect(screen.getByLabelText("Your email, for new editions")).toHaveAttribute("type", "email")
    // Visible focus on charcoal: the line turns Frost Stone (wine is too dark there).
    expect(screen.getByLabelText("Your email, for new editions").closest(".border-b")?.className).toContain("focus-within:border-dark-section-foreground")
  })

  it("adds the email to the news list and thanks the visitor", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetch)
    const user = userEvent.setup()
    renderFooter()
    await user.type(screen.getByLabelText("Your email, for new editions"), "sara@example.com")
    await user.click(screen.getByRole("button", { name: "Subscribe" }))
    expect(await screen.findByText("Thank you. You'll hear about new editions.")).toBeInTheDocument()
    expect(JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ email: "sara@example.com", rejoin: true, website: "" })
  })

  it("draws the focus ring of its links and button in Frost Stone", () => {
    renderFooter()
    expect(screen.getByRole("contentinfo")).toHaveClass("[--ring:var(--dark-section-foreground)]")
  })

  it("links the wordmark home and offers the contact email", () => {
    renderFooter()
    expect(screen.getByRole("link", { name: "Glowstone home" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "glowstone216@gmail.com" })).toHaveAttribute("href", "mailto:glowstone216@gmail.com")
  })

  it("links Omar's WhatsApp, and hides Instagram until its handle is set", () => {
    renderFooter()
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/96171284863")
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument()
  })

  it("links the Instagram profile once the handle is set", () => {
    site.instagram = "glowstone.test"
    renderFooter()
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/glowstone.test")
  })
})
