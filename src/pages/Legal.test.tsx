import { render, screen, within } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import Legal from "./Legal"

function renderDoc(doc: string) {
  const Stub = createRoutesStub([{ path: "/:lang?/legal/:doc", Component: Legal }])
  return render(<Stub initialEntries={[`/legal/${doc}`]} />)
}

describe("Legal", () => {
  it("shows the document with numbered sections and a contents list", () => {
    renderDoc("delivery")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Delivery & Returns")
    const sections = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    expect(sections).toEqual(["Where we deliver", "Cost", "Timing", "Payment", "Returns"])
    const contents = screen.getByRole("navigation", { name: "Contents" })
    expect(within(contents).getByRole("link", { name: /Payment/ })).toHaveAttribute("href", "#section-4")
    expect(document.getElementById("section-4")).toHaveTextContent("Payment")
  })

  it("says delivery is free, a far-off fee is agreed on the call, and promises no lead time", () => {
    renderDoc("delivery")
    expect(document.getElementById("section-2")).toHaveTextContent(
      "Delivery is free all over Lebanon. For far-off areas, a delivery fee may be agreed with you on the confirmation call, before anything is sent.",
    )
    expect(screen.queryByText(/lead time|made-to-order/i)).not.toBeInTheDocument()
  })

  // Omar's answers, 2026-10-26: where, how long, how the courier gets in touch, and how a gift is paid.
  it("fills where, when and how with Omar's answers", () => {
    renderDoc("delivery")
    expect(document.getElementById("section-1")).toHaveTextContent("We deliver all over Lebanon, and only within Lebanon.")
    expect(document.getElementById("section-3")).toHaveTextContent(
      "Delivery usually takes about a week, with no set delivery times. On the delivery day, the courier calls or WhatsApps the phone number given with the order.",
    )
    expect(document.getElementById("section-4")).toHaveTextContent(
      "Payment is cash on delivery. A gift is paid by the buyer, by Whish or OMT, once Omar has called and confirmed the order; the recipient pays nothing.",
    )
    expect(document.getElementById("section-4")).toHaveTextContent("Omar calls to confirm every order within 2 business days, before it leaves the workshop.")
    // Not covered by his answers: the returns policy.
    expect(screen.getAllByText(/^\[Placeholder/).map((p) => p.textContent)).toEqual(["[Placeholder: returns policy.]"])
  })

  it("says Omar confirms an order by phone within 2 business days", () => {
    renderDoc("terms")
    expect(document.getElementById("section-2")).toHaveTextContent(
      "You place an order on this site. Omar calls you within 2 business days to confirm it; nothing is sent before that call.",
    )
  })

  it("lets readers switch documents and marks the current one", () => {
    renderDoc("terms")
    const docs = screen.getByRole("navigation", { name: "Documents" })
    expect(within(docs).getByRole("link", { name: "Terms" })).toHaveAttribute("aria-current", "page")
    expect(within(docs).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/legal/privacy")
  })

  // Drafted from what the code does (Rami, 2026-10-26): what is kept, why, where, who sees it, and no trackers.
  it("says what is collected, why, where it is kept, who receives it, and that nothing tracks visitors", () => {
    renderDoc("privacy")
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "What we collect",
      "How we use it",
      "Where it is kept",
      "Who we share it with",
      "Cookies and tracking",
      "Your choices",
      "Contact",
    ])
    const section = (n: number) => document.getElementById(`section-${n}`)
    expect(section(1)).toHaveTextContent("your name, email address and Lebanese phone number")
    expect(section(1)).toHaveTextContent("the gift card message")
    expect(section(1)).toHaveTextContent("your email address, and nothing else")
    expect(section(3)).toHaveTextContent("Amazon Web Services (AWS) in Frankfurt, in the European Union")
    expect(section(3)).toHaveTextContent("Amazon Cognito")
    expect(section(3)).toHaveTextContent("Amazon SES")
    expect(section(3)).toHaveTextContent("Vercel")
    expect(section(4)).toHaveTextContent("The courier who delivers your order receives the recipient's name, phone number and delivery address.")
    expect(section(4)).toHaveTextContent("We don't sell your data.")
    expect(section(5)).toHaveTextContent("no cookies, no analytics and no advertising trackers")
    expect(section(6)).toHaveTextContent("hello@glowstonelb.com")
    expect(section(7)).toHaveTextContent("hello@glowstonelb.com")
    expect(screen.queryByText(/Placeholder/)).not.toBeInTheDocument()
  })

  it("states the prices and payment terms, and leaves only what Omar must answer", () => {
    renderDoc("terms")
    expect(document.getElementById("section-4")).toHaveTextContent("Prices are in US dollars. The price shown at checkout is the price you pay.")
    expect(document.getElementById("section-4")).toHaveTextContent("a gift is paid by the buyer, by Whish or OMT")
    expect(screen.getAllByText(/^\[Placeholder/).map((p) => p.textContent)).toEqual([
      "[Placeholder: who operates the site and how these terms apply.]",
      "[Placeholder: governing law.]",
    ])
  })

  it("dates the texts, in the page's own colour once the date is real", () => {
    renderDoc("privacy")
    const date = screen.getByText("26 October 2026")
    expect(date).not.toHaveClass("text-accent")
  })

  it("shows unconfirmed text as a placeholder", () => {
    renderDoc("terms")
    for (const placeholder of screen.getAllByText(/^\[Placeholder/)) expect(placeholder).toHaveClass("text-accent")
  })

  it("shows the missing page for an unknown document", () => {
    renderDoc("cookies")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/hasn't been carved yet/)
  })
})
