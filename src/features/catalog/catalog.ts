import { fetchProduct, fetchProducts, requireApiUrl } from "./api"
import type { Product, ProductSummary } from "./types"

// The products API (VITE_API_URL). Route loaders call it while the site is built, so pages ship with the catalog
// written in; in the browser only the live stock (live-stock.ts) and pages built after a piece was published call it.
export function apiBase(): string {
  return requireApiUrl(import.meta.env.VITE_API_URL)
}

/** GET /products: the published pieces, newest first. */
export async function listProducts(signal?: AbortSignal): Promise<ProductSummary[]> {
  return fetchProducts(apiBase(), signal)
}

/** GET /products/{id}: one published piece with all its photos, or null. */
export async function getProduct(id: number, signal?: AbortSignal): Promise<Product | null> {
  return fetchProduct(apiBase(), id, signal)
}

// The API's order: created_at desc, id desc.
export function newestFirst(a: ProductSummary, b: ProductSummary): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id - a.id
}
