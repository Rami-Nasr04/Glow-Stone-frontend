import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getProduct } from "@/features/catalog/catalog"
import { piecePhotos } from "@/features/catalog/photos"
import { renderAt } from "@/test/render"
import Gallery from "./Gallery"

const QADISHA = 5
const NAHR = 2
const piece = (id: number) => getProduct(id)!
const desktop = (container: HTMLElement) => within(container.querySelector<HTMLElement>("[data-gallery=desktop]")!)
const mobile = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-gallery=mobile]")!

describe("Gallery", () => {
  it("switches the main photo from the thumbnails, in file order", async () => {
    const user = userEvent.setup()
    const { container } = renderAt(<Gallery piece={piece(QADISHA)} />)
    const d = desktop(container)
    const thumbs = d.getAllByRole("button", { name: /Qadisha, photo \d of 4/ })
    expect(thumbs).toHaveLength(4)
    expect(thumbs[0]).toHaveAttribute("aria-pressed", "true")
    await user.click(thumbs[2])
    expect(thumbs[2]).toHaveAttribute("aria-pressed", "true")
    expect(d.getByAltText("Qadisha, photo 3 of 4")).toBeInTheDocument()
  })

  it("advances when the main photo is clicked, and wraps around", async () => {
    const user = userEvent.setup()
    const two = piecePhotos(piece(QADISHA)).slice(0, 2)
    const { container } = renderAt(<Gallery piece={piece(QADISHA)} photos={two} />)
    const d = desktop(container)
    await user.click(d.getByRole("button", { name: "Next photo" }))
    expect(d.getByAltText("Qadisha, photo 2 of 4")).toBeInTheDocument()
    await user.click(d.getByRole("button", { name: "Next photo" }))
    expect(d.getByAltText("Qadisha, photo 1 of 4")).toBeInTheDocument()
  })

  it("counts photos on the phone gallery as they are swiped", () => {
    const { container } = renderAt(<Gallery piece={piece(QADISHA)} />)
    const strip = mobile(container).querySelector("ul")!
    expect(within(mobile(container)).getByText("1 / 4")).toBeInTheDocument()
    Object.defineProperty(strip, "clientWidth", { value: 390, configurable: true })
    Object.defineProperty(strip, "scrollLeft", { value: 780, configurable: true })
    fireEvent.scroll(strip)
    expect(within(mobile(container)).getByText("3 / 4")).toBeInTheDocument()
  })

  it("shows no thumbnails or counter for a single photo, and never crops", () => {
    const single = piecePhotos(piece(NAHR)).slice(0, 1)
    const { container } = renderAt(<Gallery piece={piece(NAHR)} photos={single} />)
    expect(screen.queryByRole("button", { name: /photo/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/ \/ /)).not.toBeInTheDocument()
    for (const img of container.querySelectorAll("img")) expect(img.className).toContain("object-contain")
  })

  it("greys the photos of a sold-out piece", () => {
    const { container } = renderAt(<Gallery piece={piece(NAHR)} />)
    expect(container.querySelector("[data-gallery=desktop] img")?.className).toContain("grayscale")
  })
})
