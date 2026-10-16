import { render } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { PRODUCTS, productOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import { chosenWidth, sizesWidth, type TestScreen } from "@/test/srcset"
import About from "./About"
import Collection from "./Collection"
import Home from "./Home"
import Product from "./Product"

// Phones in their real sizes, upright and held sideways (CSS px × pixel ratio).
const PHONES: Record<string, TestScreen> = {
  "iPhone 15 upright": { width: 390, height: 844, dpr: 3 },
  "iPhone 15 Pro Max upright": { width: 430, height: 932, dpr: 3 },
  "iPhone 15 sideways": { width: 844, height: 390, dpr: 3 },
  "iPhone 15 Pro Max sideways": { width: 932, height: 430, dpr: 3 },
  "Pixel 7 sideways": { width: 915, height: 412, dpr: 2.625 },
  "Galaxy S9 sideways": { width: 740, height: 360, dpr: 4 },
}
const DESKTOP: TestScreen = { width: 1440, height: 900, dpr: 1 }

const PAGES = {
  home: () => <Home products={PRODUCTS} />,
  collection: () => <Collection products={PRODUCTS} />,
  product: () => <Product piece={productOf(4)} products={PRODUCTS} />,
  about: () => <About crestName="Arz" />,
}

function photosOf(page: keyof typeof PAGES): HTMLImageElement[] {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 1000 } as DOMRect)
  // The product page reads its id from the address, like on the site.
  const Stub = createRoutesStub([{ path: "/:lang?/collection/:id/:name?", Component: PAGES.product }])
  const { container, unmount } = page === "product" ? render(<Stub initialEntries={["/collection/4/jbeil"]} />) : renderAt(PAGES[page](), `/${page}`)
  const images = [...container.querySelectorAll<HTMLImageElement>("img[srcset]")]
  const copies = images.map((img) => img.cloneNode() as HTMLImageElement)
  unmount()
  return copies
}

const nameOf = (img: HTMLImageElement) => img.getAttribute("src")?.replace(/^.*\/(products|images)\//, "$1/")

describe("the photo sizes' resolver", () => {
  // Calibrated on what Edge downloaded on 2026-10-16 (390 px × 3 and 1440 px × 1, cache off).
  const img = (sizes: string) => {
    const element = document.createElement("img")
    element.setAttribute("srcset", [480, 960, 1440, 2048, 2880].map((w) => `p/${w}.webp ${w}w`).join(", "))
    element.setAttribute("sizes", sizes)
    return element
  }
  it("matches the measured downloads", () => {
    expect(chosenWidth(img("100vw"), PHONES["iPhone 15 upright"])).toBe(1440)
    expect(chosenWidth(img("(min-width: 768px) clamp(280px, 25vw, 360px), 72vw"), PHONES["iPhone 15 upright"])).toBe(960)
    expect(chosenWidth(img("(min-width: 1024px) 45vw, 100vw"), DESKTOP)).toBe(960)
    expect(chosenWidth(img("100vw"), PHONES["iPhone 15 Pro Max sideways"])).toBe(2880)
  })
  it("reads functions and joined conditions", () => {
    expect(sizesWidth("(orientation: landscape) min(100vw, 179svh), 100vw", { width: 900, height: 400, dpr: 1 })).toBe(716)
    expect(sizesWidth("(min-width: 600px) and (min-resolution: 2.5dppx) 10vw, 50vw", { width: 700, height: 400, dpr: 3 })).toBe(70)
  })
})

// Rami, 2026-10-16: a phone must never download the 2880 photo, upright or sideways.
describe.each(Object.keys(PAGES) as (keyof typeof PAGES)[])("the %s page's photos", (page) => {
  it.each(Object.entries(PHONES))("stay below 2880 on a %s", (_phone, screen) => {
    const tooWide = photosOf(page)
      .filter((photo) => chosenWidth(photo, screen) >= 2880)
      .map((photo) => `${nameOf(photo)} (sizes="${photo.getAttribute("sizes")}")`)
    expect(tooWide).toEqual([])
  })
})

describe("on a desktop", () => {
  it("each photo is chosen as before", () => {
    // The phone rule only applies below the desktop layout, on 2.5× screens.
    const chosen = photosOf("product").map((photo) => chosenWidth(photo, DESKTOP))
    expect(chosen[0]).toBe(960)
    for (const screen of [DESKTOP, { ...DESKTOP, dpr: 2 }]) {
      for (const page of Object.keys(PAGES) as (keyof typeof PAGES)[]) {
        for (const photo of photosOf(page)) {
          const sizes = photo.getAttribute("sizes") ?? ""
          expect(sizesWidth(sizes, screen)).toBe(sizesWidth(sizes.replace(/\(min-resolution: [\d.]+dppx\) [^,]+, /g, ""), screen))
        }
      }
    }
  })
})
