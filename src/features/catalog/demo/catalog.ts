import type { Product, ProductSummary } from "../types.ts"
import details from "./products-detail.json" with { type: "json" }
import list from "./products-list.json" with { type: "json" }

// The catalog on `npm run dev:demo`: the live API's answers saved on 2026-11-02 (GET /products in Omar's order with 2
// photos each, and GET /products/1…6 with all photos). The photos are the real ones on the CDN. (The tests use their
// own, older snapshot in src/test/fixtures.)
export const demoProducts = (): ProductSummary[] => list as ProductSummary[]

export const demoProduct = (id: number): Product | null => (details as Product[]).find((piece) => piece.id === id) ?? null

/** Every saved piece with all its photos, in id order: the studio's demo pieces start from these. */
export const demoDetails = (): Product[] => details as Product[]
