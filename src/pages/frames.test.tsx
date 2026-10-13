import { render } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { renderAt } from "@/test/render"
import About from "./About"
import Collection from "./Collection"
import Home from "./Home"
import Product from "./Product"

// A box with an aspect ratio still grows to fit a taller photo unless it clips its overflow
// (CSS: the automatic minimum size). Every photo frame must therefore clip, or a portrait photo
// stretches a landscape frame (seen on About at 390px).
describe("photo frames", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 1000, bottom: 1060 } as DOMRect)
  })
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ["Home", <Home key="home" />, "/"],
    ["Collection", <Collection key="collection" />, "/collection"],
    ["About", <About key="about" />, "/about"],
  ])("clips every aspect-ratio frame on %s", (_, page, path) => {
    expectClippedFrames(renderAt(page, path).container)
  })

  it("clips every aspect-ratio frame on a product page", () => {
    const Stub = createRoutesStub([{ path: "/:lang?/collection/:id/:name?", Component: Product }])
    expectClippedFrames(render(<Stub initialEntries={["/collection/5/qadisha"]} />).container)
  })
})

function expectClippedFrames(container: HTMLElement) {
  const frames = [...container.querySelectorAll<HTMLElement>("[class*='aspect-']")]
  expect(frames.length).toBeGreaterThan(0)
  for (const frame of frames) expect(frame.className, frame.className).toContain("overflow-hidden")
}
