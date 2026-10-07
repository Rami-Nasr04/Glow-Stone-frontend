import bundled from "./catalog-data.json"
import type { Product, ProductSummary } from "./types"

// Until the products API is live, pages read this bundled copy, stored exactly as GET /products/{id} returns each
// published piece (provisional ids 1–8). Switching to the API changes only this file: listProducts() becomes
// GET /products and getProduct(id) becomes GET /products/{id}.
const PRODUCTS: Product[] = bundled

// The API's order: created_at desc, id desc.
export function newestFirst(a: ProductSummary, b: ProductSummary): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id - a.id
}

function summaryOf({ story: _story, ...summary }: Product): ProductSummary {
  return summary
}

export function listProducts(): ProductSummary[] {
  return PRODUCTS.map(summaryOf).sort(newestFirst)
}

export function getProduct(id: number): Product | null {
  return PRODUCTS.find((product) => product.id === id) ?? null
}
