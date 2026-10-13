import { productOf } from "@/test/catalog"
import { spotlightPhotos } from "./spotlight"

const upright = (n: number) => ({ url: `https://photos.test/${n}`, width: 2880, height: 4318 })
const landscape = (n: number) => ({ url: `https://photos.test/${n}`, width: 2880, height: 1921 })

describe("spotlight photos", () => {
  it("frames the cover over the first landscape photo in Omar's order", () => {
    expect(spotlightPhotos([upright(1), upright(2), landscape(3), landscape(4)])).toEqual({
      cover: upright(1),
      detail: landscape(3),
      inset: upright(1),
    })
  })

  it("uses Qadisha's fourth photo as the detail today", () => {
    const { images } = productOf(5)
    expect(spotlightPhotos(images)).toEqual({ cover: images[0], detail: images[3], inset: images[0] })
  })

  it("falls back to the cover alone when there is no landscape photo, or when the cover is the only one", () => {
    expect(spotlightPhotos([upright(1), upright(2)])).toEqual({ cover: upright(1), detail: null, inset: null })
    expect(spotlightPhotos([landscape(1)])).toEqual({ cover: landscape(1), detail: null, inset: null })
  })

  it("has nothing to show without photos", () => {
    expect(spotlightPhotos([])).toEqual({ cover: null, detail: null, inset: null })
  })
})
