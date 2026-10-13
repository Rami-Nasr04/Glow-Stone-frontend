import { PRODUCTS as all } from "@/test/catalog"
import { activeCount, filterOptions, filterPieces, NO_FILTERS, readFilters, writeFilters } from "./filters"

const options = filterOptions(all)
const ids = (pieces: { id: number }[]) => pieces.map((p) => p.id)

describe("collection filters", () => {
  it("builds the stone and colour choices from the pieces themselves", () => {
    expect(options.stone).toEqual([{ value: "limestone", label: "Limestone" }])
    expect(options.color.map((o) => o.label)).toEqual(["Cream", "Earth brown", "Grey", "Taupe", "Warm beige"])
    expect(options.color[1].value).toBe("earth-brown")
  })

  it("reads filters from the address and ignores values no piece has", () => {
    expect(readFilters(new URLSearchParams("color=earth-brown&capacity=5&availability=available"), options)).toEqual({
      stone: null,
      color: "earth-brown",
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
    expect(ids(filterPieces(all, { ...NO_FILTERS, color: "earth-brown" }))).toEqual([6, 2])
    expect(filterPieces(all, { ...NO_FILTERS, stone: "limestone" })).toHaveLength(6)
  })

  it("filters by capacity, with 10 meaning ten or more", () => {
    expect(ids(filterPieces(all, { ...NO_FILTERS, capacity: "1" }))).toEqual([3])
    expect(ids(filterPieces(all, { ...NO_FILTERS, capacity: "10" }))).toEqual([6, 5])
  })

  it("filters by availability", () => {
    expect(ids(filterPieces(all, { ...NO_FILTERS, availability: "sold_out" }))).toEqual([2])
    expect(ids(filterPieces(all, { ...NO_FILTERS, availability: "available" }))).toEqual([6, 5, 4, 3, 1])
  })

  it("combines filters and counts the active ones", () => {
    const filters = { ...NO_FILTERS, color: "earth-brown", capacity: "10" } as const
    expect(ids(filterPieces(all, filters))).toEqual([6])
    expect(activeCount(filters)).toBe(2)
  })
})
