import { fireEvent, screen } from "@testing-library/react"
import { getProduct } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import StickyAddBar from "./StickyAddBar"

// Puts the main button at `bottom` px from the top of the viewport and scrolls, the way a jump or a fast fling does.
function scrollButtonTo(button: HTMLButtonElement, bottom: number) {
  button.getBoundingClientRect = () => ({ top: bottom - 60, bottom }) as DOMRect
  fireEvent.scroll(window)
}

describe("StickyAddBar", () => {
  function setup() {
    const button = document.createElement("button")
    button.getBoundingClientRect = () => ({ top: 1200, bottom: 1260 }) as DOMRect
    const { container } = renderAt(<StickyAddBar piece={getProduct(3)!} target={{ current: button }} />)
    return { bar: container.querySelector<HTMLElement>("[data-sticky-bar]")!, button }
  }

  it("stays hidden and out of the tab order while the main button is in view or still below", () => {
    const { bar, button } = setup()
    expect(bar).toHaveAttribute("aria-hidden", "true")
    expect(bar).toHaveAttribute("inert")
    scrollButtonTo(button, 400)
    expect(bar).toHaveAttribute("aria-hidden", "true")
  })

  it("appears even after a jump straight past the button, and hides again when it is back", () => {
    const { bar, button } = setup()
    scrollButtonTo(button, -1100)
    expect(bar).toHaveAttribute("aria-hidden", "false")
    expect(bar).not.toHaveAttribute("inert")
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeInTheDocument()
    scrollButtonTo(button, 300)
    expect(bar).toHaveAttribute("aria-hidden", "true")
  })
})
