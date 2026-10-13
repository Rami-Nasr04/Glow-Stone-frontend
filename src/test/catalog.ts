import type { Product, ProductSummary } from "@/features/catalog/types"
import details from "./fixtures/products-detail.json"
import list from "./fixtures/products-list.json"

// The live API's answers on 2026-10-14: GET /products (newest first, 2 photos each) and GET /products/1…6 (all photos).
// Ids: 1 Arz, 2 Nahr (sold out), 3 Batroun, 4 Jbeil (no sizes, 19 photos), 5 Qadisha, 6 Sannine.
export const PRODUCTS = list as ProductSummary[]

export function summaryOf(id: number): ProductSummary {
  const piece = PRODUCTS.find((p) => p.id === id)
  if (!piece) throw new Error(`No piece ${id} in the fixture`)
  return piece
}

export function productOf(id: number): Product {
  const piece = (details as Product[]).find((p) => p.id === id)
  if (!piece) throw new Error(`No piece ${id} in the fixture`)
  return piece
}

/** Stubs fetch with the fixture answers; any other path is a 404. */
export function stubApi() {
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const path = new URL(String(input)).pathname
    const id = /^\/products\/(\d+)$/.exec(path)?.[1]
    const data = path === "/products" ? PRODUCTS : id ? (details as Product[]).find((p) => p.id === Number(id)) : undefined
    if (!data) return new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }), { status: 404 })
    return new Response(JSON.stringify({ success: true, data }))
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}
