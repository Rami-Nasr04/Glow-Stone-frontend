import type { AdminProduct, AdminProductImage, Product } from "../catalog/types.ts"

// Stand-in for the admin pieces, photos and publish routes on `npm run dev:demo`: the live API answers only the live
// shop and studio (backend 9e28860), so the studio's pieces start as the saved catalog (src/features/catalog/demo) and
// change only in this browser. The backend's shapes and words; photos can't be added, as they would go to the live
// storage, which takes no local address either.

export const STUDIO_DEMO_PRODUCTS_KEY = "glowstone.studio-demo.products"
export const DEMO_PHOTO_REFUSAL = "Photos can't be added on the demo: they would go to the live storage."

// The backend's words (admin product and photo services, photo rules).
const WORDS = {
  invalidId: "Invalid product id",
  invalidPhotoId: "Invalid photo id",
  notFound: "Product not found",
  photoNotFound: "Photo not found",
  draftFirst: "Set this piece to draft before deleting it.",
  nothingToChange: "Send at least one field to change",
  badOrder: "Send every photo of this piece exactly once.",
  badPieceOrder: "Send every piece exactly once. If a piece was just added or deleted, reload the list.",
} as const

const INPUT_KEYS = [
  "name",
  "stoneType",
  "color",
  "price",
  "bottles",
  "heightCm",
  "widthCm",
  "depthCm",
  "weightKg",
  "editionSize",
  "remaining",
  "status",
  "featured",
  "summary",
  "story",
] as const

export class DemoRefusal extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** The answer to one request: a status and the envelope's data (undefined for 204). */
export interface DemoAnswer {
  status: number
  data?: unknown
}

// The saved pieces in Omar's order (the saved list's order), each with all its photos.
function seedFrom(details: readonly Product[], order: readonly { id: number }[]): AdminProduct[] {
  const inOrder = order.map(({ id }) => details.find((piece) => piece.id === id)).filter((piece): piece is Product => piece !== undefined)
  return inOrder.map((piece) => ({
    ...piece,
    status: "published" as const,
    updatedAt: piece.createdAt,
    images: piece.images.map((photo, i) => ({ ...photo, id: piece.id * 100 + i + 1, position: i + 1 })),
  }))
}


function idOf(raw: string | undefined, word: string): number {
  if (raw === undefined || !/^\d{1,9}$/.test(raw) || Number(raw) < 1) throw new DemoRefusal(400, "VALIDATION", word)
  return Number(raw)
}

function inputOf(body: unknown): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  if (typeof body !== "object" || body === null) return fields
  for (const key of INPUT_KEYS) if (key in body) fields[key] = (body as Record<string, unknown>)[key]
  for (const key of ["summary", "story"]) if (typeof fields[key] === "string" && !(fields[key] as string).trim()) fields[key] = null
  return fields
}

const renumbered = (photos: AdminProductImage[]) => photos.map((photo, i) => ({ ...photo, position: i + 1 }))

export function createDemoProducts(storage: Storage | null) {
  let memory: AdminProduct[] | null = null

  async function load(): Promise<AdminProduct[]> {
    const saved = storage?.getItem(STUDIO_DEMO_PRODUCTS_KEY)
    if (saved) {
      try {
        return JSON.parse(saved) as AdminProduct[]
      } catch {
        // A broken store starts again from the saved catalog.
      }
    }
    if (!storage && memory) return memory
    const { demoDetails, demoProducts } = await import("../catalog/demo/catalog.ts")
    const fresh = seedFrom(demoDetails(), demoProducts())
    save(fresh)
    return fresh
  }

  function save(pieces: AdminProduct[]) {
    memory = pieces
    storage?.setItem(STUDIO_DEMO_PRODUCTS_KEY, JSON.stringify(pieces))
  }

  function find(pieces: AdminProduct[], raw: string | undefined): AdminProduct {
    const id = idOf(raw, WORDS.invalidId)
    const found = pieces.find((piece) => piece.id === id)
    if (!found) throw new DemoRefusal(404, "NOT_FOUND", WORDS.notFound)
    return found
  }

  /** "/admin/products[/order|/{id}[/photos[/upload|/order|/{imageId}]]]" or "/admin/publish"; null for any other path. */
  async function answer(method: string, path: string, body: unknown): Promise<DemoAnswer | null> {
    if (path === "/admin/publish") return method === "POST" ? { status: 202, data: { started: true } } : null
    // Omar's order: every piece exactly once, first to last; anything else moves nothing (contract, 2026-11-02).
    if (path === "/admin/products/order") {
      if (method !== "PUT") return null
      const pieces = await load()
      const ids: unknown[] = typeof body === "object" && body !== null && Array.isArray((body as { productIds?: unknown }).productIds) ? (body as { productIds: unknown[] }).productIds : []
      const sent = new Set(ids)
      const exact = sent.size === ids.length && sent.size === pieces.length && pieces.every((piece) => sent.has(piece.id))
      if (!exact) throw new DemoRefusal(400, "VALIDATION_ERROR", WORDS.badPieceOrder)
      const arranged = ids.map((id) => pieces.find((piece) => piece.id === id) as AdminProduct)
      save(arranged)
      return { status: 200, data: arranged }
    }
    const match = /^\/admin\/products(?:\/([^/]+))?(?:\/photos(?:\/([^/]+))?)?\/?$/.exec(path)
    if (!match) return null
    const [, rawId, photoPart] = match
    const photos = path.includes("/photos")
    const pieces = await load()

    if (!photos && rawId === undefined) {
      // The array order is Omar's order.
      if (method === "GET") return { status: 200, data: pieces }
      if (method === "POST") {
        const now = new Date().toISOString()
        const fields = inputOf(body)
        const piece = {
          heightCm: null,
          widthCm: null,
          depthCm: null,
          weightKg: null,
          featured: false,
          summary: null,
          story: null,
          status: "draft",
          ...fields,
          id: Math.max(0, ...pieces.map((p) => p.id)) + 1,
          soldOut: fields.remaining === 0,
          createdAt: now,
          updatedAt: now,
          images: [],
          // The studio's form checks every field before it sends (the backend checks again); the demo trusts it.
        } as unknown as AdminProduct
        // A new piece goes first, until Omar arranges again.
        save([piece, ...pieces])
        return { status: 201, data: piece }
      }
      return null
    }

    const piece = find(pieces, rawId)
    if (!photos) {
      if (method === "GET") return { status: 200, data: piece }
      if (method === "PATCH") {
        const fields = inputOf(body)
        if (Object.keys(fields).length === 0) throw new DemoRefusal(400, "VALIDATION", WORDS.nothingToChange)
        const changed = { ...piece, ...fields, updatedAt: new Date().toISOString() } as AdminProduct
        changed.soldOut = changed.remaining === 0
        save(pieces.map((p) => (p.id === piece.id ? changed : p)))
        return { status: 200, data: changed }
      }
      if (method === "DELETE") {
        if (piece.status === "published") throw new DemoRefusal(409, "CONFLICT", WORDS.draftFirst)
        save(pieces.filter((p) => p.id !== piece.id))
        return { status: 204 }
      }
      return null
    }

    // Adding a photo (asking for a slot, or confirming one) would reach the live storage.
    if (method === "POST") throw new DemoRefusal(409, "CONFLICT", DEMO_PHOTO_REFUSAL)
    if (method === "PUT" && photoPart === "order") {
      const ids = typeof body === "object" && body !== null && Array.isArray((body as { imageIds?: unknown }).imageIds) ? (body as { imageIds: unknown[] }).imageIds : []
      const sent = new Set(ids)
      const exact = sent.size === ids.length && sent.size === piece.images.length && piece.images.every((photo) => sent.has(photo.id))
      if (!exact) throw new DemoRefusal(400, "VALIDATION", WORDS.badOrder)
      const images = renumbered(ids.map((id) => piece.images.find((photo) => photo.id === id) as AdminProductImage))
      save(pieces.map((p) => (p.id === piece.id ? { ...piece, images } : p)))
      return { status: 200, data: images }
    }
    if (method === "DELETE" && photoPart !== undefined) {
      const imageId = idOf(photoPart, WORDS.invalidPhotoId)
      if (!piece.images.some((photo) => photo.id === imageId)) throw new DemoRefusal(404, "NOT_FOUND", WORDS.photoNotFound)
      const images = renumbered(piece.images.filter((photo) => photo.id !== imageId))
      save(pieces.map((p) => (p.id === piece.id ? { ...piece, images } : p)))
      return { status: 204 }
    }
    return null
  }

  return { answer }
}
