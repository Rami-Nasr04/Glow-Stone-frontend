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
    expect(document.getElementById("section-5")).toHaveTextContent("Because every piece is carved by hand from natural stone, we don't take returns for a change of mind. Please check your piece with the courier before they leave. If it arrives damaged, send us a photo on WhatsApp or to hello@glowstonelb.com within 48 hours: Omar will repair or replace it, or refund you in full.")
    expect(screen.queryByText(/Placeholder/)).not.toBeInTheDocument()
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

  it("states who runs the site, the prices and payment terms, and the governing law", () => {
    renderDoc("terms")
    expect(document.getElementById("section-4")).toHaveTextContent("Prices are in US dollars. The price shown at checkout is the price you pay.")
    expect(document.getElementById("section-4")).toHaveTextContent("a gift is paid by the buyer, by Whish or OMT")
    expect(document.getElementById("section-1")).toHaveTextContent("This website is run by Omar Al Bakeer, trading as Glowstone, Beirut, Lebanon. These terms apply to every order placed on glowstonelb.com. By placing an order, you accept them.")
    expect(document.getElementById("section-5")).toHaveTextContent("These terms are governed by the laws of Lebanon. If a problem arises, write to us first and we will do our best to solve it together. If we can't, the courts of Beirut will decide.")
    expect(screen.queryByText(/Placeholder/)).not.toBeInTheDocument()
  })

  // Omar's final texts (Rami, 2026-11-02): the designs, photos and texts are Glowstone's, the last section of the terms.
  it("ends the terms with who owns the designs, photos and texts", () => {
    renderDoc("terms")
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    expect(headings.at(-1)).toBe("Designs, photos and texts")
    expect(document.getElementById(`section-${headings.length}`)).toHaveTextContent("All designs, photographs and texts on this website belong to Glowstone, except where a photo is credited to its author. Please don't copy or reproduce them without our written permission. Sharing a link to a page is always welcome.")
  })

  // CC BY-SA 4.0 asks for a visible credit: it moved from under the photo to the terms (Rami, 2026-11-02).
  it("credits the Qadisha Valley photo in the terms, linking to the photo and the licence", () => {
    renderDoc("terms")
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    const section = document.getElementById(`section-${headings.indexOf("Designs, photos and texts") + 1}`)!
    const credit = [...section.querySelectorAll("p")].at(-1)!
    expect(credit).toHaveTextContent("The photo of the Qadisha Valley on the About page is by Evan Williams (cropped), licensed under CC BY-SA 4.0.")
    expect(within(credit).getByRole("link", { name: "Evan Williams" })).toHaveAttribute(
      "href",
      "https://commons.wikimedia.org/wiki/File:Qadisha_Valley,_Aerial_View_From_Qannoubine_Monastery.jpg",
    )
    expect(within(credit).getByRole("link", { name: "CC BY-SA 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/")
  })

  it("dates the texts, in the page's own colour once the date is real", () => {
    renderDoc("privacy")
    const date = screen.getByText("2 November 2026")
    expect(date).not.toHaveClass("text-accent")
  })

  it("shows the missing page for an unknown document", () => {
    renderDoc("cookies")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/hasn't been carved yet/)
  })
})
