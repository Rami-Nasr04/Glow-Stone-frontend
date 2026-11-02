import { localDemo } from "@/lib/local-demo"
import { fetchProduct, fetchProducts, requireApiUrl } from "./api"
import type { Product, ProductSummary } from "./types"

// The products API (VITE_API_URL). Route loaders call it while the site is built, so pages ship with the catalog
// written in; in the browser only the live stock (live-stock.ts) and pages built after a piece was published call it.
// On `npm run dev:demo` the saved catalog answers instead (src/lib/local-demo.ts).
export function apiBase(): string {
  return requireApiUrl(import.meta.env.VITE_API_URL)
}

/** GET /products: the published pieces, newest first. */
export async function listProducts(signal?: AbortSignal): Promise<ProductSummary[]> {
  if (import.meta.env.DEV && localDemo()) return (await import("./demo/catalog")).demoProducts()
  return fetchProducts(apiBase(), signal)
}

/** GET /products/{id}: one published piece with all its photos, or null. */
export async function getProduct(id: number, signal?: AbortSignal): Promise<Product | null> {
  if (import.meta.env.DEV && localDemo()) return (await import("./demo/catalog")).demoProduct(id)
  return fetchProduct(apiBase(), id, signal)
}
