import { createAdminApi, type AdminApi, StudioError } from "./admin-api"
import { createStudioDemoFetch } from "./demo-orders"
import { DEMO_PHOTO_REFUSAL, STUDIO_DEMO_PRODUCTS_KEY } from "./demo-products"

const BASE = "https://api.test"

function setup(): AdminApi {
  return createAdminApi({ baseUrl: BASE, accessToken: async () => "access-1", onUnauthorized: vi.fn(), fetch: createStudioDemoFetch({ storage: window.localStorage }) })
}

async function caught(promise: Promise<unknown>): Promise<StudioError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof StudioError) return error
    throw error
  }
  throw new Error("expected a StudioError")
}

const INPUT = { name: "Test piece", stoneType: "Limestone", color: "Grey", price: 300, bottles: 3, editionSize: 5, remaining: 5 }

// The live API answers only the live shop and studio (backend 9e28860): on npm run dev:demo the studio's pieces are the
// saved catalog, kept in this browser, and nothing reaches the network.
describe("the studio's demo pieces (npm run dev:demo)", () => {
  let network: ReturnType<typeof vi.fn>
  beforeEach(() => {
    window.localStorage.clear()
    network = vi.fn(async () => new Response("{}"))
    vi.stubGlobal("fetch", network)
  })
  afterEach(() => expect(network).not.toHaveBeenCalled())

  it("starts with the six saved pieces, published, in Omar's order, each photo with its id and place", async () => {
    const pieces = await setup().listProducts()
    expect(pieces.map((p) => p.id)).toEqual([5, 6, 1, 2, 4, 3])
    expect(pieces.every((p) => p.status === "published")).toBe(true)
    const qadisha = await setup().getProduct(5)
    expect(qadisha.images.length).toBeGreaterThan(2)
    expect(qadisha.images.map((photo) => photo.position)).toEqual(qadisha.images.map((_, i) => i + 1))
    expect(window.localStorage.getItem(STUDIO_DEMO_PRODUCTS_KEY)).not.toBeNull()
  })

  it("creates a draft, changes it, and deletes it; a published piece must go back to draft first, in the API's words", async () => {
    const api = setup()
    const draft = await api.createProduct(INPUT)
    expect(draft).toMatchObject({ ...INPUT, status: "draft", images: [], soldOut: false })
    expect((await api.listProducts())[0].id).toBe(draft.id)
    expect(await api.updateProduct(draft.id, { price: 320 })).toMatchObject({ price: 320, name: "Test piece" })
    await api.deleteProduct(draft.id)
    expect((await caught(api.getProduct(draft.id))).message).toBe("Product not found")
    const refused = await caught(api.deleteProduct(5))
    expect([refused.code, refused.message]).toEqual(["CONFLICT", "Set this piece to draft before deleting it."])
  })

  it("reorders and deletes photos, and refuses an order that isn't every photo once", async () => {
    const api = setup()
    const ids = (await api.getProduct(5)).images.map((photo) => photo.id)
    const reversed = [...ids].reverse()
    expect((await api.reorderPhotos(5, reversed)).map((photo) => photo.id)).toEqual(reversed)
    expect((await caught(api.reorderPhotos(5, ids.slice(1)))).message).toBe("Send every photo of this piece exactly once.")
    await api.deletePhoto(5, reversed[0])
    const after = (await api.getProduct(5)).images
    expect(after.map((photo) => photo.id)).toEqual(reversed.slice(1))
    expect(after.map((photo) => photo.position)).toEqual(after.map((_, i) => i + 1))
    expect((await caught(api.deletePhoto(5, reversed[0]))).message).toBe("Photo not found")
  })

  // A photo would go to the live storage, which no longer takes local addresses either.
  it("refuses to add photos, saying why", async () => {
    const refused = await caught(setup().requestUpload(5))
    expect([refused.code, refused.message]).toEqual(["CONFLICT", DEMO_PHOTO_REFUSAL])
  })

  // Contract, "Arrange the pieces" (2026-11-02): a new piece goes first; the whole list is sent in the new order.
  it("puts a new piece first, and keeps the order Omar saves", async () => {
    const api = setup()
    const draft = await api.createProduct(INPUT)
    const ids = (await api.listProducts()).map((p) => p.id)
    expect(ids).toEqual([draft.id, 5, 6, 1, 2, 4, 3])
    const wanted = [3, 5, 6, draft.id, 1, 2, 4]
    expect((await api.reorderProducts(wanted)).map((p) => p.id)).toEqual(wanted)
    expect((await api.listProducts()).map((p) => p.id)).toEqual(wanted)
  })

  it("refuses an order that isn't every piece once, in the API's words, and moves nothing", async () => {
    const api = setup()
    const refused = await caught(api.reorderProducts([5, 6, 1]))
    expect([refused.status, refused.message]).toEqual([400, "Send every piece exactly once. If a piece was just added or deleted, reload the list."])
    expect((await api.listProducts()).map((p) => p.id)).toEqual([5, 6, 1, 2, 4, 3])
  })

  it("starts publishing as the API does, without publishing anything", async () => {
    await expect(setup().publish()).resolves.toBeUndefined()
  })

  it("answers an unknown piece as the API does", async () => {
    expect((await caught(setup().getProduct(99))).message).toBe("Product not found")
  })
})
