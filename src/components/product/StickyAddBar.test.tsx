import { act, screen } from "@testing-library/react"
import { getProduct } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import StickyAddBar from "./StickyAddBar"

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void
let report: Callback = () => {}

function seeButton(isIntersecting: boolean, top: number) {
  act(() => report([{ isIntersecting, boundingClientRect: { top } as DOMRectReadOnly }]))
}

describe("StickyAddBar", () => {
  beforeEach(() => {
    window.IntersectionObserver = vi.fn(function (callback: Callback) {
      report = callback
      return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() }
    }) as unknown as typeof IntersectionObserver
  })

  function setup() {
    const target = { current: document.createElement("button") }
    const { container } = renderAt(<StickyAddBar piece={getProduct("batroun", "en")!} target={target} />)
    return container.querySelector<HTMLElement>("[data-sticky-bar]")!
  }

  it("stays hidden and out of the tab order while the main button is in view or still below", () => {
    const bar = setup()
    expect(bar).toHaveAttribute("aria-hidden", "true")
    expect(bar).toHaveAttribute("inert")
    seeButton(false, 1200)
    expect(bar).toHaveAttribute("aria-hidden", "true")
  })

  it("slides in once the main button has scrolled above, and hides again when it is back", () => {
    const bar = setup()
    seeButton(false, -80)
    expect(bar).toHaveAttribute("aria-hidden", "false")
    expect(bar).not.toHaveAttribute("inert")
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeInTheDocument()
    seeButton(true, 300)
    expect(bar).toHaveAttribute("aria-hidden", "true")
  })
})
