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

  it("marks unconfirmed facts as placeholders", () => {
    renderAt(<Chapters crestName="Arz" />)
    expect(screen.getByText("[Placeholder: how each piece is marked and documented.]")).toHaveClass("text-accent")
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
