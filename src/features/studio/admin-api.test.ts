import type { ProductInput } from "@/features/catalog/types"
import { adminProductOf, failure, ok, unauthorized } from "@/test/studio"
import { createAdminApi, StudioError } from "./admin-api"

const BASE = "https://api.test"

const input: ProductInput = {
  name: "Studio check",
  stoneType: "Limestone",
  color: "Cream",
  price: 420,
  bottles: 6,
  heightCm: 72,
  widthCm: null,
  depthCm: null,
  weightKg: null,
  editionSize: 8,
  remaining: 8,
  status: "draft",
  featured: false,
  summary: null,
  story: null,
}

function setup(answer: (url: string, init: RequestInit) => Response | Promise<Response>, token: string | null = "access-1") {
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => answer(String(url), init ?? {}))
  vi.stubGlobal("fetch", fetch)
  const onUnauthorized = vi.fn()
  const api = createAdminApi({ baseUrl: BASE, accessToken: async () => token, onUnauthorized })
  return { api, fetch, onUnauthorized }
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

describe("the admin API client", () => {
  it("sends the access token as Bearer on every call", async () => {
    const { api, fetch } = setup(() => ok([adminProductOf(1)]))
    await api.listProducts()
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/admin/products`)
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access-1")
  })

  it("lists every piece, drafts included, as the API orders them", async () => {
    const pieces = [adminProductOf(6, { status: "draft" }), adminProductOf(1)]
    const { api } = setup(() => ok(pieces))
    expect(await api.listProducts()).toEqual(pieces)
  })

  it("reads one piece", async () => {
    const { api, fetch } = setup(() => ok(adminProductOf(5, { status: "draft" })))
    expect((await api.getProduct(5)).status).toBe("draft")
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/admin/products/5`)
  })

  it("creates with POST and expects 201", async () => {
    const { api, fetch } = setup(() => ok(adminProductOf(1, { id: 7, name: "Studio check", status: "draft" }), 201))
    expect((await api.createProduct(input)).id).toBe(7)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/admin/products`)
    expect(init?.method).toBe("POST")
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json")
    expect(JSON.parse(String(init?.body))).toEqual(input)
  })

  it("refuses a create that doesn't answer 201", async () => {
    const { api } = setup(() => ok(adminProductOf(1, { id: 7 })))
    expect((await caught(api.createProduct(input))).code).toBe("UNEXPECTED")
  })

  it("changes with PATCH, sending only the fields given", async () => {
    const { api, fetch } = setup(() => ok(adminProductOf(3, { status: "draft" })))
    await api.updateProduct(3, { status: "draft" })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/admin/products/3`)
    expect(init?.method).toBe("PATCH")
    expect(JSON.parse(String(init?.body))).toEqual({ status: "draft" })
  })

  it("never sends a key the API doesn't take", async () => {
    const { api, fetch } = setup(() => ok(adminProductOf(3)))
    const sneaky = { price: 500, soldOut: true, id: 9, images: [], createdAt: "x" } as unknown as Partial<ProductInput>
    await api.updateProduct(3, sneaky)
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ price: 500 })
  })

  it("puts a validation message that names a field on that field, as the API wrote it", async () => {
    const { api } = setup(() => failure(400, "VALIDATION", "price must be more than 0"))
    const error = await caught(api.updateProduct(3, { price: 0 }))
    expect(error).toMatchObject({ status: 400, code: "VALIDATION", field: "price", message: "price must be more than 0" })
    const edition = setup(() => failure(400, "VALIDATION", "remaining can't be more than editionSize"))
    expect((await caught(edition.api.updateProduct(3, { remaining: 99 }))).field).toBe("remaining")
  })

  it("keeps other validation messages for the whole form", async () => {
    for (const message of ['Unrecognized key: "prise"', "Send at least one field to change", "That value isn't allowed"]) {
      const { api } = setup(() => failure(400, "VALIDATION", message))
      const error = await caught(api.updateProduct(3, { price: 1 }))
      expect(error.field).toBeUndefined()
      expect(error.message).toBe(message)
    }
  })

  it("puts a name conflict on the name field", async () => {
    const { api } = setup(() => failure(409, "CONFLICT", "A published piece already has that name"))
    expect(await caught(api.createProduct(input))).toMatchObject({ status: 409, code: "CONFLICT", field: "name" })
  })

  it("reports an unknown piece as not found", async () => {
    const { api } = setup(() => failure(404, "NOT_FOUND", "Product not found"))
    expect(await caught(api.getProduct(99))).toMatchObject({ status: 404, code: "NOT_FOUND" })
  })

  it("judges API Gateway's 401 by its status, and ends the session", async () => {
    const { api, onUnauthorized } = setup(unauthorized)
    expect(await caught(api.listProducts())).toMatchObject({ status: 401, code: "UNAUTHORIZED" })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it("treats the envelope's 401 the same way", async () => {
    const { api, onUnauthorized } = setup(() => failure(401, "UNAUTHORIZED", "Not authorized"))
    expect((await caught(api.listProducts())).status).toBe(401)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it("doesn't call the API without a session, and ends it", async () => {
    const { api, fetch, onUnauthorized } = setup(() => ok([]), null)
    expect((await caught(api.listProducts())).status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it("reports a network failure without ending the session", async () => {
    const { api, onUnauthorized } = setup(() => Promise.reject(new TypeError("Failed to fetch")))
    expect(await caught(api.listProducts())).toMatchObject({ status: 0, code: "NETWORK" })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it("reports a server error that isn't JSON", async () => {
    const { api } = setup(() => new Response("Internal Server Error", { status: 502 }))
    expect(await caught(api.listProducts())).toMatchObject({ status: 502, code: "UNAVAILABLE" })
  })

  it("reads each photo's id and position", async () => {
    const { api } = setup(() => ok(adminProductOf(5)))
    const piece = await api.getProduct(5)
    expect(piece.images.slice(0, 2)).toEqual([
      { ...adminProductOf(5).images[0], id: 501, position: 1 },
      { ...adminProductOf(5).images[1], id: 502, position: 2 },
    ])
  })

  it("refuses photos without an id, or out of order", async () => {
    const piece = adminProductOf(5)
    const [first, second, ...rest] = piece.images
    const { id: _id, ...noId } = first
    const broken = [
      { ...piece, images: [noId, second, ...rest] },
      { ...piece, images: [second, first, ...rest] },
      { ...piece, images: [first, { ...second, position: 3 }, ...rest] },
    ]
    for (const answer of broken) {
      const { api } = setup(() => ok(answer))
      expect((await caught(api.getProduct(5))).code).toBe("UNEXPECTED")
    }
  })

  it("refuses an answer that isn't an admin product", async () => {
    const { status: _status, ...noStatus } = adminProductOf(1)
    const { api } = setup(() => ok(noStatus))
    expect((await caught(api.getProduct(1))).code).toBe("UNEXPECTED")
  })
})

const slot = { uploadId: "0b6c3c1e-9a43-4a39-8d1e-2f1c4c7a9b10", url: "https://uploads.test/", fields: { key: "incoming/5/x", policy: "p" } }

describe("the admin photo calls", () => {
  it("asks for one upload slot", async () => {
    const { api, fetch } = setup(() => ok(slot))
    expect(await api.requestUpload(5)).toEqual(slot)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/admin/products/5/photos/upload`)
    expect(init?.method).toBe("POST")
    expect(init?.body).toBeUndefined()
  })

  it("refuses a slot without its upload id, address or fields", async () => {
    for (const broken of [{ ...slot, uploadId: "" }, { ...slot, url: 5 }, { ...slot, fields: { key: 1 } }, { ...slot, fields: null }]) {
      const { api } = setup(() => ok(broken))
      expect((await caught(api.requestUpload(5))).code).toBe("UNEXPECTED")
    }
  })

  it("confirms an upload and reads the new photo (201)", async () => {
    const photo = { ...adminProductOf(5).images[0], id: 77, position: 10 }
    const { api, fetch } = setup(() => ok(photo, 201))
    expect(await api.confirmUpload(5, slot.uploadId)).toEqual(photo)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/admin/products/5/photos`)
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ uploadId: slot.uploadId })
  })

  it("passes the photo messages on exactly as the API wrote them", async () => {
    for (const [status, code, message] of [
      [400, "VALIDATION", "This photo is too small for the website (at least 1067 px wide)."],
      [400, "VALIDATION", "This upload wasn't found. Upload the photo again."],
      [409, "CONFLICT", "A piece can have at most 30 photos."],
    ] as const) {
      const { api } = setup(() => failure(status, code, message))
      expect(await caught(api.confirmUpload(5, slot.uploadId))).toMatchObject({ status, code, message })
    }
  })

  it("sends the full new order and reads it back", async () => {
    const images = adminProductOf(5).images
    const reordered = [images[1], images[0], ...images.slice(2)].map((image, i) => ({ ...image, position: i + 1 }))
    const { api, fetch } = setup(() => ok(reordered))
    expect(await api.reorderPhotos(5, reordered.map((image) => image.id))).toEqual(reordered)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/admin/products/5/photos/order`)
    expect(init?.method).toBe("PUT")
    expect(JSON.parse(String(init?.body))).toEqual({ imageIds: reordered.map((image) => image.id) })
  })

  it("deletes a photo on a 204 with no body", async () => {
    const { api, fetch } = setup(() => new Response(null, { status: 204 }))
    await expect(api.deletePhoto(5, 503)).resolves.toBeUndefined()
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/admin/products/5/photos/503`)
    expect(init?.method).toBe("DELETE")
  })

  it("ends the session on a 401 from a photo call", async () => {
    const { api, onUnauthorized } = setup(unauthorized)
    expect((await caught(api.deletePhoto(5, 503))).status).toBe(401)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
