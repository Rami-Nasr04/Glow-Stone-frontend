import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { productOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import Gallery from "./Gallery"

const qadisha = productOf(5)
const nahr = productOf(2)
const desktop = (container: HTMLElement) => within(container.querySelector<HTMLElement>("[data-gallery=desktop]")!)
const mobile = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-gallery=mobile]")!

describe("Gallery", () => {
  it("shows every photo from the API in Omar's order, named from the piece", () => {
    const { container } = renderAt(<Gallery piece={qadisha} />)
    const thumbs = desktop(container).getAllByRole("button", { name: /^Qadisha, photo \d of 9$/ })
    expect(thumbs).toHaveLength(9)
    const main = desktop(container).getByAltText("Qadisha, photo 1 of 9")
    expect(main).toHaveAttribute("src", `${qadisha.images[0].url}/960.webp`)
    expect(main).toHaveAttribute("sizes", "(min-width: 1024px) 45vw, 100vw")
    // Each photo keeps its own shape: the fourth is the landscape one.
    const slides = mobile(container).querySelectorAll("img")
    expect(slides).toHaveLength(9)
    expect(slides[3]).toHaveAttribute("width", String(qadisha.images[3].width))
    expect(slides[3]).toHaveAttribute("height", String(qadisha.images[3].height))
    expect(slides[3]).toHaveAttribute("alt", "Qadisha, photo 4 of 9")
  })

  it("switches the main photo from the thumbnails", async () => {
    const user = userEvent.setup()
    const { container } = renderAt(<Gallery piece={qadisha} />)
    const d = desktop(container)
    const thumbs = d.getAllByRole("button", { name: /Qadisha, photo \d of 9/ })
    expect(thumbs[0]).toHaveAttribute("aria-pressed", "true")
    await user.click(thumbs[2])
    expect(thumbs[2]).toHaveAttribute("aria-pressed", "true")
    expect(d.getByAltText("Qadisha, photo 3 of 9")).toHaveAttribute("src", `${qadisha.images[2].url}/960.webp`)
  })

  it("advances when the main photo is clicked, and wraps around", async () => {
    const user = userEvent.setup()
    const { container } = renderAt(<Gallery piece={{ ...qadisha, images: qadisha.images.slice(0, 2) }} />)
    const d = desktop(container)
    await user.click(d.getByRole("button", { name: "Next photo" }))
    expect(d.getByAltText("Qadisha, photo 2 of 2")).toBeInTheDocument()
    await user.click(d.getByRole("button", { name: "Next photo" }))
    expect(d.getByAltText("Qadisha, photo 1 of 2")).toBeInTheDocument()
  })

  it("counts photos on the phone gallery as they are swiped", () => {
    const { container } = renderAt(<Gallery piece={qadisha} />)
    const strip = mobile(container).querySelector("ul")!
    expect(within(mobile(container)).getByText("1 / 9")).toBeInTheDocument()
    Object.defineProperty(strip, "clientWidth", { value: 390, configurable: true })
    Object.defineProperty(strip, "scrollLeft", { value: 780, configurable: true })
    fireEvent.scroll(strip)
    expect(within(mobile(container)).getByText("3 / 9")).toBeInTheDocument()
  })

  it("shows no thumbnails or counter for a single photo, and never crops", () => {
    const { container } = renderAt(<Gallery piece={{ ...nahr, images: nahr.images.slice(0, 1) }} />)
    expect(screen.queryByRole("button", { name: /photo/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/ \/ /)).not.toBeInTheDocument()
    expect(screen.getAllByAltText("Nahr, photo 1 of 1")).toHaveLength(2)
    for (const img of container.querySelectorAll("img")) expect(img.className).toContain("object-contain")
  })

  it("shows the plain stone frame with the monogram when the piece has no photo yet", () => {
    const { container } = renderAt(<Gallery piece={{ ...qadisha, images: [] }} />)
    expect(container.querySelectorAll("[data-no-photo]")).toHaveLength(2)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByText(/ \/ /)).not.toBeInTheDocument()
    // The placard still names the piece.
    expect(screen.getByText(/Qadisha — Cream limestone/)).toBeInTheDocument()
  })

  it("greys the photos of a sold-out piece", () => {
    const { container } = renderAt(<Gallery piece={nahr} />)
    expect(container.querySelector("[data-gallery=desktop] img")?.className).toContain("grayscale")
  })
})
