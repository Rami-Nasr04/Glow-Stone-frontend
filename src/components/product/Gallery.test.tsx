import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getProduct } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import Gallery from "./Gallery"

const piece = (slug: string) => getProduct(slug, "en")!
const desktop = (container: HTMLElement) => within(container.querySelector<HTMLElement>("[data-gallery=desktop]")!)
const mobile = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-gallery=mobile]")!

describe("Gallery", () => {
  it("switches the main photo from the thumbnails, in file order", async () => {
    const user = userEvent.setup()
    const { container } = renderAt(<Gallery piece={piece("batroun")} />)
    const d = desktop(container)
    const thumbs = d.getAllByRole("button", { name: /Batroun, photo \d of 4/ })
    expect(thumbs).toHaveLength(4)
    expect(thumbs[0]).toHaveAttribute("aria-pressed", "true")
    await user.click(thumbs[2])
    expect(thumbs[2]).toHaveAttribute("aria-pressed", "true")
    expect(d.getByAltText("Batroun, photo 3 of 4")).toBeInTheDocument()
  })

  it("advances when the main photo is clicked, and wraps around", async () => {
    const user = userEvent.setup()
    const { container } = renderAt(<Gallery piece={piece("qadisha-ash")} />)
    const d = desktop(container)
    await user.click(d.getByRole("button", { name: "Next photo" }))
    expect(d.getByAltText("Qadisha · Ash, photo 2 of 2")).toBeInTheDocument()
    await user.click(d.getByRole("button", { name: "Next photo" }))
    expect(d.getByAltText("Qadisha · Ash, photo 1 of 2")).toBeInTheDocument()
  })

  it("counts photos on the phone gallery as they are swiped", () => {
    const { container } = renderAt(<Gallery piece={piece("batroun")} />)
    const strip = mobile(container).querySelector("ul")!
    expect(within(mobile(container)).getByText("1 / 4")).toBeInTheDocument()
    Object.defineProperty(strip, "clientWidth", { value: 390, configurable: true })
    Object.defineProperty(strip, "scrollLeft", { value: 780, configurable: true })
    fireEvent.scroll(strip)
    expect(within(mobile(container)).getByText("3 / 4")).toBeInTheDocument()
  })

  it("shows no thumbnails or counter for a single photo, and never crops", () => {
    const single = { ...piece("nahr"), images: piece("nahr").images.slice(0, 1) }
    const { container } = renderAt(<Gallery piece={single} />)
    expect(screen.queryByRole("button", { name: /photo/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/ \/ /)).not.toBeInTheDocument()
    for (const img of container.querySelectorAll("img")) expect(img.className).toContain("object-contain")
  })

  it("greys the photos of a sold-out piece", () => {
    const { container } = renderAt(<Gallery piece={piece("byblos")} />)
    expect(container.querySelector("[data-gallery=desktop] img")?.className).toContain("grayscale")
  })
})
