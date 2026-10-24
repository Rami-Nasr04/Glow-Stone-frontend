import { fireEvent, renderHook, screen } from "@testing-library/react"
import { CART_KEY, useCart } from "@/features/cart/cart"
import { productOf } from "@/test/catalog"
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
    const { container } = renderAt(<StickyAddBar piece={productOf(3)} target={{ current: button }} />)
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

  it("adds one piece to the cart and opens the drawer", () => {
    const { button } = setup()
    scrollButtonTo(button, -1100)
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([{ productId: 3, quantity: 1, price: 180 }])
    const { result } = renderHook(() => useCart())
    expect(result.current.open).toBe(true)
  })
})
