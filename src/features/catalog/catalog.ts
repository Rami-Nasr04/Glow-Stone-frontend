import bundled from "./catalog-data.json"
import type { Product, ProductSummary } from "./types"

// Until the website reads the products API, pages read this bundled copy of the six real pieces, stored exactly as
// GET /products/{id} returns them (copied from the database seed, ids 1–6). Switching to
// the API changes only this file: listProducts() becomes GET /products and getProduct(id) becomes GET /products/{id}.
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
