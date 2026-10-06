import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import CollectionIntro from "./CollectionIntro"

describe("CollectionIntro", () => {
  it("counts the pieces in words, so the intro never goes stale", () => {
    renderAt(<CollectionIntro count={8} />)
    expect(screen.getByRole("heading", { level: 1, name: "The Collection" })).toBeInTheDocument()
    expect(screen.getByText("Eight pieces in Lebanese limestone, each carved by hand in a small numbered edition.")).toBeInTheDocument()
  })

  it("handles a single piece and counts beyond twelve in digits", () => {
    const { unmount } = renderAt(<CollectionIntro count={1} />)
    expect(screen.getByText(/^One piece in Lebanese limestone/)).toBeInTheDocument()
    unmount()
    renderAt(<CollectionIntro count={15} />)
    expect(screen.getByText(/^15 pieces in Lebanese limestone/)).toBeInTheDocument()
  })
})
