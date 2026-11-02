import details from "@/test/fixtures/products-detail.json"
import list from "@/test/fixtures/products-list.json"
import { fetchProduct, fetchProducts, requireApiUrl } from "./api"

const BASE = "https://api.test"

// Field names of GET /products and GET /products/{id}, as agreed with the backend.
const SUMMARY_FIELDS = [
  "bottles",
  "color",
  "createdAt",
  "depthCm",
  "editionSize",
  "featured",
  "heightCm",
  "id",
  "images",
  "name",
  "price",
  "remaining",
  "soldOut",
  "stoneType",
  "summary",
  "weightKg",
  "widthCm",
]

function respond(body: unknown, status = 200) {
  const fetch = vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }))
  vi.stubGlobal("fetch", fetch)
  return fetch
}

const ok = (data: unknown) => ({ success: true, data })
const firstWith = (changes: Record<string, unknown>) => ok([{ ...list[0], ...changes }, ...list.slice(1)])
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

afterEach(() => vi.unstubAllGlobals())

describe("products API", () => {
  it("reads the list in the contract's shape, in the API's order", async () => {
    const fetch = respond(ok(list))
    const products = await fetchProducts(BASE)
    expect(fetch).toHaveBeenCalledWith(`${BASE}/products`, expect.anything())
    expect(products.map((p) => `${p.id} ${p.name}`)).toEqual(["6 Sannine", "5 Qadisha", "4 Jbeil", "3 Batroun", "2 Nahr", "1 Arz"])
    for (const product of products) expect(Object.keys(product).sort()).toEqual(SUMMARY_FIELDS)
    expect(products[1].images[0]).toEqual({ url: "https://disbl63io6ns2.cloudfront.net/products/5/6m2q4gr2hfl7", width: 2880, height: 4318 })
  })

  it("keeps only the contract's fields", async () => {
    respond(firstWith({ status: "draft", internalNote: "x" }))
    expect(Object.keys((await fetchProducts(BASE))[0]).sort()).toEqual(SUMMARY_FIELDS)
  })

  it("reads one piece with all its photos and its story", async () => {
    const fetch = respond(ok(details[4]))
    const qadisha = await fetchProduct(BASE, 5)
    expect(fetch).toHaveBeenCalledWith(`${BASE}/products/5`, expect.anything())
    expect(qadisha?.images).toHaveLength(9)
    expect(Object.keys(qadisha!).sort()).toEqual([...SUMMARY_FIELDS, "story"].sort())
  })

  it("finds nothing for an unknown or unpublished piece (404)", async () => {
    respond({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, 404)
    expect(await fetchProduct(BASE, 99)).toBeNull()
  })

  it("accepts a piece with no photos", async () => {
    respond(ok({ ...details[0], images: [] }))
    expect((await fetchProduct(BASE, 1))?.images).toEqual([])
  })

  it("trims a trailing slash from the base address", async () => {
    const fetch = respond(ok(list))
    await fetchProducts(`${BASE}/`)
    expect(fetch).toHaveBeenCalledWith(`${BASE}/products`, expect.anything())
  })

  describe("refuses bad answers, so the build stops instead of publishing a broken catalog", () => {
    it.each([
      ["a network failure", () => vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed"))), /GET \/products: fetch failed/],
      ["a server error", () => respond({ success: false, error: { code: "INTERNAL", message: "Something broke" } }, 500), /GET \/products: 500 INTERNAL Something broke/],
      ["a page that is not JSON", () => respond("<html>Bad gateway</html>", 502), /GET \/products: 502/],
      ["bad JSON on a 200", () => respond("{not json"), /GET \/products: the answer is not JSON/],
      ["an error envelope on a 200", () => respond({ success: false, error: { code: "X", message: "No" } }), /GET \/products: success is not true/],
      ["no list", () => respond(ok({ items: [] })), /GET \/products: data must be a list/],
      ["an empty list", () => respond(ok([])), /GET \/products: no published products/],
      ["a duplicate id", () => respond(ok([list[0], list[0]])), /GET \/products: id 6 appears twice/],
      ["a missing field", () => respond(ok([{ ...list[0], price: undefined }])), /GET \/products: product 1 \(id 6\): price must be a number/],
      ["a wrong type", () => respond(firstWith({ editionSize: "10" })), /editionSize must be a whole number/],
      ["a bad id", () => respond(firstWith({ id: 0 })), /id must be a positive whole number/],
      ["an empty name", () => respond(firstWith({ name: " " })), /name must be text/],
      ["a bad date", () => respond(firstWith({ createdAt: "yesterday" })), /createdAt must be a date/],
      ["sold out out of step with remaining", () => respond(firstWith({ soldOut: true })), /soldOut must equal remaining === 0/],
      ["a size that is text", () => respond(firstWith({ heightCm: "96" })), /heightCm must be a number or null/],
      ["no photo list", () => respond(firstWith({ images: null })), /images must be a list/],
      ["a photo address that is not https", () => respond(firstWith({ images: [{ url: "http://x.test/a", width: 10, height: 10 }] })), /images\[0\]\.url must be an https address/],
      ["a photo with no size", () => respond(firstWith({ images: [{ url: "https://x.test/a", width: 0, height: 10 }] })), /images\[0\]\.width must be a positive whole number/],
    ])("%s", async (_, setup, message) => {
      setup()
      await expect(fetchProducts(BASE)).rejects.toThrow(message)
    })

    it("a piece answered under another id", async () => {
      respond(ok(details[3]))
      await expect(fetchProduct(BASE, 5)).rejects.toThrow(/GET \/products\/5: answered with id 4/)
    })

    it("a story that is not text", async () => {
      const bad = clone(details[4]) as Record<string, unknown>
      bad.story = 42
      respond(ok(bad))
      await expect(fetchProduct(BASE, 5)).rejects.toThrow(/story must be text or null/)
    })
  })

  it("needs the API address", () => {
    expect(() => requireApiUrl(undefined)).toThrow("VITE_API_URL is not set")
    expect(() => requireApiUrl(" ")).toThrow("VITE_API_URL is not set")
    expect(() => requireApiUrl("ftp://api.test")).toThrow("VITE_API_URL must be an http(s) address")
    expect(requireApiUrl(" https://api.test/ ")).toBe("https://api.test")
  })
})
