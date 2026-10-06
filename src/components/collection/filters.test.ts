import { listProducts } from "@/features/catalog/catalog"
import { activeCount, filterPieces, readFilters, writeFilters } from "./filters"

const all = listProducts("en")
const slugs = (pieces: { slug: string }[]) => pieces.map((p) => p.slug)

describe("collection filters", () => {
  it("reads filters from the address and ignores unknown values", () => {
    expect(readFilters(new URLSearchParams("stone=grey&capacity=5&availability=ready"))).toEqual({
      stone: "grey",
      capacity: "5",
      availability: "ready",
    })
    expect(readFilters(new URLSearchParams("stone=marble&capacity=7&availability=soon"))).toEqual({
      stone: null,
      capacity: null,
      availability: null,
    })
  })

  it("writes only the filters that are set", () => {
    expect(writeFilters({ stone: "brown", capacity: null, availability: null }).toString()).toBe("stone=brown")
    expect(writeFilters({ stone: null, capacity: null, availability: null }).toString()).toBe("")
  })

  it("filters by stone", () => {
    expect(slugs(filterPieces(all, { stone: "grey", capacity: null, availability: null }))).toEqual(["sannine-ash", "qadisha-ash", "arz"])
  })

  it("filters by capacity, with 10 meaning ten or more", () => {
    expect(slugs(filterPieces(all, { stone: null, capacity: "1", availability: null }))).toEqual(["nahr"])
    expect(slugs(filterPieces(all, { stone: null, capacity: "10", availability: null }))).toEqual(["qadisha-earth", "qadisha-ash", "batroun"])
  })

  it("filters by availability", () => {
    const by = (availability: "ready" | "made_to_order" | "sold_out") => slugs(filterPieces(all, { stone: null, capacity: null, availability }))
    expect(by("sold_out")).toEqual(["byblos"])
    expect(by("made_to_order")).toEqual(["qadisha-ash", "batroun"])
    expect(by("ready")).not.toContain("byblos")
    expect(by("ready")).not.toContain("batroun")
  })

  it("combines filters and counts the active ones", () => {
    const filters = { stone: "grey", capacity: "10", availability: null } as const
    expect(slugs(filterPieces(all, filters))).toEqual(["qadisha-ash"])
    expect(activeCount(filters)).toBe(2)
  })
})
