import { fireEvent, screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import AboutClose from "./AboutClose"
import AboutIntro from "./AboutIntro"
import Chapters from "./Chapters"
import PullQuote from "./PullQuote"

describe("About sections", () => {
  // jsdom does no layout: start with every chapter below the fold, as on a fresh page load.
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 1000 } as DOMRect)
  })
  afterEach(() => vi.restoreAllMocks())

  it("opens with the page title, the last word in italics", () => {
    renderAt(<AboutIntro />)
    const title = screen.getByRole("heading", { level: 1 })
    expect(title).toHaveTextContent("Omar, and the patience of stone.")
    expect(title.querySelector("em")).toHaveTextContent("stone.")
  })

  it("tells four chapters, each with its own landscape photo on phones", () => {
    const { container } = renderAt(<Chapters crestName="Arz" />)
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["The stone", "The carving", "The edition", "Time"])
    expect(container.querySelectorAll("article .aspect-3\\/2")).toHaveLength(4)
  })

  it("tells of the stone as granite, without the limestone quarries", () => {
    renderAt(<Chapters crestName="Arz" />)
    expect(screen.getByText("Omar grew up in a village above the Qadisha Valley, where houses, terraces and chapels are all built of stone.")).toBeInTheDocument()
    expect(
      screen.getByText(
        "His grandfather cut stone for walls. His father cut it for thresholds and fountains. Omar learned to read stone before he learned to carve it: where the grain runs, where a block will split cleanly, and where it will not.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("Today he carves granite: dense, hard and slow to shape, in warm shades of beige and brown. He still chooses every block himself.")).toBeInTheDocument()
    expect(screen.queryByText(/limestone|Sannine|Batroun|laid down by a sea/i)).not.toBeInTheDocument()
  })

  it("says how each piece is marked in its edition", () => {
    renderAt(<Chapters crestName="Arz" />)
    expect(screen.getByText("Each piece is signed by hand and carries its number in the edition, for example 3 / 8, carved discreetly into its base. It comes with a card naming the piece, its stone and its number, signed by Omar.")).toBeInTheDocument()
    expect(screen.queryByText(/Placeholder/)).not.toBeInTheDocument()
  })

  it("labels the photo panel with the chapter in view, following the scroll", () => {
    const { container } = renderAt(<Chapters crestName="Arz" />)
    const label = container.querySelector("[data-chapter-label]")!
    expect(label).toHaveTextContent("01 / 04 · The stone")
    const articles = container.querySelectorAll("article")
    const tops = [-1600, -900, 200, 1100]
    articles.forEach((article, i) => {
      article.getBoundingClientRect = () => ({ top: tops[i] }) as DOMRect
    })
    fireEvent.scroll(window)
    expect(label).toHaveTextContent("03 / 04 · The edition")
  })

  it("closes on the stone with a link to the collection", () => {
    renderAt(<AboutClose />)
    expect(screen.getByText("Made in Lebanon.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View the collection" })).toHaveAttribute("href", "/collection")
  })

  it("keeps the invented quote off the page until Omar approves it", () => {
    const { container } = renderAt(<PullQuote />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/Omar, stonemason/)).not.toBeInTheDocument()
  })
})
