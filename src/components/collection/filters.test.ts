import { listProducts } from "@/features/catalog/catalog"
import { activeCount, filterOptions, filterPieces, NO_FILTERS, readFilters, writeFilters } from "./filters"

const all = listProducts()
const options = filterOptions(all)
const ids = (pieces: { id: number }[]) => pieces.map((p) => p.id)

describe("collection filters", () => {
  it("builds the stone and colour choices from the pieces themselves", () => {
    expect(options.stone).toEqual([{ value: "limestone", label: "Limestone" }])
    expect(options.color.map((o) => o.label)).toEqual(["Ash grey", "Cream", "Earth brown", "Grey", "Taupe", "Warm beige"])
    expect(options.color[0].value).toBe("ash-grey")
  })

  it("reads filters from the address and ignores values no piece has", () => {
    expect(readFilters(new URLSearchParams("color=ash-grey&capacity=5&availability=available"), options)).toEqual({
      stone: null,
      color: "ash-grey",
      capacity: "5",
      availability: "available",
    })
    expect(readFilters(new URLSearchParams("stone=marble&color=green&capacity=7&availability=soon"), options)).toEqual(NO_FILTERS)
  })

  it("writes only the filters that are set", () => {
    expect(writeFilters({ ...NO_FILTERS, color: "cream" }).toString()).toBe("color=cream")
    expect(writeFilters(NO_FILTERS).toString()).toBe("")
  })

  it("filters by colour and by stone", () => {
    expect(ids(filterPieces(all, { ...NO_FILTERS, color: "ash-grey" }))).toEqual([7, 5])
    expect(filterPieces(all, { ...NO_FILTERS, stone: "limestone" })).toHaveLength(8)
  })

  it("filters by capacity, with 10 meaning ten or more", () => {
    expect(ids(filterPieces(all, { ...NO_FILTERS, capacity: "1" }))).toEqual([2])
    expect(ids(filterPieces(all, { ...NO_FILTERS, capacity: "10" }))).toEqual([6, 5, 3])
  })

  it("filters by availability", () => {
    expect(ids(filterPieces(all, { ...NO_FILTERS, availability: "sold_out" }))).toEqual([4])
    expect(ids(filterPieces(all, { ...NO_FILTERS, availability: "available" }))).toEqual([8, 7, 6, 5, 3, 2, 1])
  })

  it("combines filters and counts the active ones", () => {
    const filters = { ...NO_FILTERS, color: "earth-brown", capacity: "10" } as const
    expect(ids(filterPieces(all, filters))).toEqual([6])
    expect(activeCount(filters)).toBe(2)
  })
})
