import type { AdminProduct } from "@/features/catalog/types"
import { productOf } from "./catalog"

// A piece as GET /admin/products/{id} answers it: the public fields plus status and updatedAt.
export function adminProductOf(id: number, changes: Partial<AdminProduct> = {}): AdminProduct {
  return { ...productOf(id), status: "published", updatedAt: "2026-10-14T09:00:00.000Z", ...changes }
}

/** A JSON answer in the API's envelope. */
export function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), { status, headers: { "Content-Type": "application/json" } })
}

/** An error answer in the API's envelope. */
export function failure(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), { status, headers: { "Content-Type": "application/json" } })
}

/** API Gateway's own 401: not the envelope. */
export function unauthorized(): Response {
  return new Response('{"message":"Unauthorized"}', { status: 401, headers: { "Content-Type": "application/json" } })
}
