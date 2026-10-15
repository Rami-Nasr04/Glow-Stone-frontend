import { adminProductOf } from "@/test/studio"
import { STUDIO_COPY } from "./copy"
import { changedFields, EMPTY_FORM, formFromProduct, readForm, type ProductFormValues } from "./product-form"

const e = STUDIO_COPY.form.errors

const filled: ProductFormValues = {
  ...EMPTY_FORM,
  name: "  Studio check ",
  stoneType: "Limestone",
  color: "Cream",
  price: "420",
  bottles: "6",
  editionSize: "8",
  remaining: "8",
}

function errorsOf(values: Partial<ProductFormValues>) {
  const result = readForm({ ...filled, ...values })
  return "errors" in result ? result.errors : {}
}

describe("the product form", () => {
  it("starts empty, as a draft that isn't featured", () => {
    expect(EMPTY_FORM).toMatchObject({ name: "", price: "", status: "draft", featured: false })
  })

  it("shows a piece's values as text, with empty boxes for missing sizes", () => {
    const values = formFromProduct(adminProductOf(4, { story: null }))
    expect(values).toMatchObject({ name: "Jbeil", heightCm: "", weightKg: "", story: "", status: "published" })
    expect(formFromProduct(adminProductOf(1)).price).toBe("420")
  })

  it("reads a full input: trimmed text, numbers, blank optional text and sizes as null", () => {
    const result = readForm({ ...filled, summary: "   ", story: "\n", heightCm: " 72.5 " })
    expect(result).toEqual({
      input: {
        name: "Studio check",
        stoneType: "Limestone",
        color: "Cream",
        price: 420,
        bottles: 6,
        heightCm: 72.5,
        widthCm: null,
        depthCm: null,
        weightKg: null,
        editionSize: 8,
        remaining: 8,
        status: "draft",
        featured: false,
        summary: null,
        story: null,
      },
    })
  })

  it("keeps the blank line between story paragraphs", () => {
    const result = readForm({ ...filled, story: " First.\n\nSecond. " })
    expect("input" in result && result.input.story).toBe("First.\n\nSecond.")
  })

  it("refuses blank required text", () => {
    expect(errorsOf({ name: " ", stoneType: "", color: "" })).toEqual({ name: e.required, stoneType: e.required, color: e.required })
    expect(errorsOf({ price: "", bottles: "", editionSize: "", remaining: "" })).toEqual({
      price: e.required,
      bottles: e.required,
      editionSize: e.required,
      remaining: e.required,
    })
  })

  it("checks the price like the database: more than 0, at most 2 decimals, not too large", () => {
    expect(errorsOf({ price: "0" })).toEqual({ price: e.positive })
    expect(errorsOf({ price: "-5" })).toEqual({ price: e.number })
    expect(errorsOf({ price: "$420" })).toEqual({ price: e.number })
    expect(errorsOf({ price: "420.555" })).toEqual({ price: e.priceDecimals })
    expect(errorsOf({ price: "100000000" })).toEqual({ price: e.tooLarge })
    expect(errorsOf({ price: "420.50" })).toEqual({})
  })

  it("wants whole numbers above 0 for bottles and edition, and 0 or more for remaining", () => {
    expect(errorsOf({ bottles: "0" })).toEqual({ bottles: e.positive })
    expect(errorsOf({ bottles: "2.5" })).toEqual({ bottles: e.whole })
    expect(errorsOf({ editionSize: "0", remaining: "0" })).toEqual({ editionSize: e.positive })
    expect(errorsOf({ remaining: "0" })).toEqual({})
    expect(errorsOf({ remaining: "1.5" })).toEqual({ remaining: e.whole })
    expect(errorsOf({ bottles: "3000000000" })).toEqual({ bottles: e.tooLarge })
  })

  it("never lets remaining go above the edition", () => {
    expect(errorsOf({ editionSize: "8", remaining: "9" })).toEqual({ remaining: e.aboveEdition })
  })

  it("checks sizes and weight: more than 0, at most 1 decimal, or left empty", () => {
    expect(errorsOf({ heightCm: "0" })).toEqual({ heightCm: e.positive })
    expect(errorsOf({ widthCm: "12.25" })).toEqual({ widthCm: e.measureDecimals })
    expect(errorsOf({ weightKg: "100000" })).toEqual({ weightKg: e.tooLarge })
    expect(errorsOf({ depthCm: "abc" })).toEqual({ depthCm: e.number })
    expect(errorsOf({ heightCm: "", widthCm: " " })).toEqual({})
  })
})

describe("changedFields", () => {
  const original = adminProductOf(1)
  const same = () => {
    const result = readForm(formFromProduct(original))
    if (!("input" in result)) throw new Error("the piece's own values should be valid")
    return result.input
  }

  it("finds nothing when the values are the same", () => {
    expect(changedFields(original, same())).toEqual({})
  })

  it("treats 420 and 420.00, and trailing spaces, as no change", () => {
    const result = readForm({ ...formFromProduct(original), price: "420.00", name: `${original.name}  ` })
    expect("input" in result && changedFields(original, result.input)).toEqual({})
  })

  it("sends only what changed", () => {
    expect(changedFields(original, { ...same(), price: 450, featured: false })).toEqual({ price: 450, featured: false })
  })

  it("sends null when a size or the summary is cleared", () => {
    expect(changedFields(original, { ...same(), heightCm: null, summary: null })).toEqual({ heightCm: null, summary: null })
  })
})
