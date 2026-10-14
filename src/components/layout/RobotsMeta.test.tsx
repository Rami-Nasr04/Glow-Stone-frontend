import { render } from "@testing-library/react"
import RobotsMeta from "./RobotsMeta"

const robots = () => document.head.querySelectorAll('meta[name="robots"]')

describe("RobotsMeta", () => {
  it("asks search engines to stay away until indexing is allowed", () => {
    render(<RobotsMeta allowIndexing={false} />)
    expect(robots()).toHaveLength(1)
    expect(robots()[0]).toHaveAttribute("content", "noindex, nofollow")
  })

  it("says nothing once indexing is allowed", () => {
    render(<RobotsMeta allowIndexing />)
    expect(robots()).toHaveLength(0)
  })

  it("follows VITE_ALLOW_INDEXING by default (false in tests, as before launch)", () => {
    render(<RobotsMeta />)
    expect(robots()).toHaveLength(1)
  })
})
