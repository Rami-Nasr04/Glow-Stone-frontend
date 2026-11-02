import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import CollectionIntro from "./CollectionIntro"

describe("CollectionIntro", () => {
  it("counts the pieces in words and names their stone from the data, so the intro never goes stale", () => {
    renderAt(<CollectionIntro stoneTypes={Array<string>(8).fill("Granite")} />)
    expect(screen.getByRole("heading", { level: 1, name: "The Collection" })).toBeInTheDocument()
    expect(screen.getByText("Eight pieces in granite, each carved by hand in a small numbered edition.")).toBeInTheDocument()
  })

  it("handles a single piece, counts beyond twelve in digits, and says stone when the pieces differ", () => {
    const { unmount } = renderAt(<CollectionIntro stoneTypes={["Granite"]} />)
    expect(screen.getByText("One piece in granite, carved by hand in a small numbered edition.")).toBeInTheDocument()
    unmount()
    renderAt(<CollectionIntro stoneTypes={[...Array<string>(14).fill("Granite"), "Marble"]} />)
    expect(screen.getByText(/^15 pieces in stone,/)).toBeInTheDocument()
    expect(screen.queryByText(/limestone|Lebanese granite/i)).not.toBeInTheDocument()
  })
})
