import { fireEvent, screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import AboutClose from "./AboutClose"
import AboutIntro from "./AboutIntro"
import Chapters from "./Chapters"
import OmarStory from "./OmarStory"
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

  // Omar's own words open the page (Rami, 2026-11-02): the approved translation as verse, then his Arabic as written.
  it("opens with Omar's story as verse, signed Glowstone", () => {
    renderAt(<OmarStory />)
    const story = screen.getByRole("region", { name: "Omar's story" })
    const stanzas = [...story.querySelectorAll("[data-stanza]")].filter((stanza) => !stanza.closest('[lang="ar"]')).map((stanza) => stanza.innerHTML.split("<br>").map((line) => line.replace(/<[^>]+>/g, "")))
    expect(stanzas[0]).toEqual(["Here, there is history, and time, and nature."])
    expect(stanzas[1]).toEqual(["Here are lines that nature drew,", "here rain and sun have passed,", "and spring, and autumn."])
    expect(stanzas.at(-1)).toEqual(["Glowstone", "The tale of the land, carrying on the story of wine."])
    expect(stanzas).toHaveLength(6)
  })

  it("gives Omar's Arabic as written, right to left, in its own block", () => {
    renderAt(<OmarStory />)
    const arabic = screen.getByRole("region", { name: "Omar's story" }).querySelector('[lang="ar"]')!
    expect(arabic).toHaveAttribute("dir", "rtl")
    const lines = [...arabic.querySelectorAll("[data-stanza]")].flatMap((stanza) => stanza.innerHTML.split("<br>").map((line) => line.replace(/<[^>]+>/g, "")))
    expect(lines).toEqual(["هون في تاريخ، وزمن، وطبيعة.", "هون في خطوط رسمتها الطبيعة،", "وهون مرق شتي وشمس،", "وربيع وخريف.", "نحن مناخد هالصخرة من الأرض،", "ومنحوّلها لتصبح جزءاً من قصة أكبر.", "قطعة بتحمل تاريخ النبيذ وفلسفته،", "وبتكمّل قصته، من الأرض إلى الكأس،", "ومن الكأس إلى قطعة بتعيش بمكان جديد.", "وكل Collection بتحمل روح المكان اللي إجت منه،", "وبتعكس طبيعته، هويته، وأثر الزمن عليه.", "Glow Stone", "حكاية الأرض، بتكمّل قصة النبيذ."])
  })

  // From the desktop breakpoint the English and the Arabic face each other (Rami, 2026-11-02): one grid filled column by
  // column, a row per stanza, so stanza n of each language shares row n whatever its length. Below it: English, then Arabic.
  it("pairs each English stanza with its Arabic stanza on desktop, and keeps them one under the other below it", () => {
    renderAt(<OmarStory />)
    const story = screen.getByRole("region", { name: "Omar's story" })
    const spread = story.querySelector("[data-spread]")!
    const [english, arabic] = [...spread.children]
    expect(arabic).toHaveAttribute("lang", "ar")
    const englishStanzas = english.querySelectorAll("[data-stanza]")
    const arabicStanzas = arabic.querySelectorAll("[data-stanza]")
    expect(englishStanzas).toHaveLength(arabicStanzas.length)
    expect(spread.className).toMatch(/(^| )flex-col( |$)/)
    for (const name of ["lg:grid", "lg:grid-flow-col", `lg:grid-rows-[repeat(${englishStanzas.length},auto)]`, "lg:items-baseline"]) {
      expect(spread.className.split(" ")).toContain(name)
    }
    for (const side of [english, arabic]) expect(side.className.split(" ")).toContain("lg:contents")
    expect(englishStanzas[englishStanzas.length - 1]).toHaveTextContent("Glowstone")
    expect(arabicStanzas[arabicStanzas.length - 1]).toHaveTextContent("Glow Stone")
  })

  it("tells four chapters, each with its own landscape photo on phones", () => {
    const { container } = renderAt(<Chapters />)
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["The stone", "The carving", "The edition", "Time"])
    expect(container.querySelectorAll("article .aspect-3\\/2")).toHaveLength(4)
  })

  it("tells of the stone as granite, without the limestone quarries", () => {
    renderAt(<Chapters />)
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
    renderAt(<Chapters />)
    expect(screen.getByText("Each piece is signed by hand and carries its number in the edition, for example 3 / 8, carved discreetly into its base. It comes with a card naming the piece, its stone and its number, signed by Omar.")).toBeInTheDocument()
    expect(screen.queryByText(/Placeholder/)).not.toBeInTheDocument()
  })

  // Evan Williams' photo, CC BY-SA 4.0: its credit is on the Terms page, not under the photo (Rami, 2026-11-02).
  it("shows the Qadisha Valley in the chapter on the stone, with no caption under it", () => {
    const { container } = renderAt(<Chapters />)
    const valley = screen.getAllByAltText(/^The Qadisha Valley from the air/)
    expect(valley.length).toBeGreaterThan(0)
    expect(valley[0]).toHaveAttribute("src", "/images/about/qadisha-valley-960.webp")
    expect(container.querySelector("[data-photo-credit]")).toBeNull()
    expect(screen.queryByText(/Evan Williams|CC BY-SA/)).not.toBeInTheDocument()
  })

  it("labels the photo panel with the chapter in view, following the scroll", () => {
    const { container } = renderAt(<Chapters />)
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
