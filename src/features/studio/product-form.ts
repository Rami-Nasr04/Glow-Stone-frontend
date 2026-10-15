// The product form: text boxes ⇄ the API's ProductInput, the same checks as the database (so a bad value never
// reaches the API), and the fields an edit really changed.
import type { AdminProduct, ProductInput, ProductStatus } from "@/features/catalog/types"
import type { ProductField } from "./admin-api"
import { STUDIO_COPY } from "./copy"

export interface ProductFormValues {
  name: string
  stoneType: string
  color: string
  summary: string
  story: string
  price: string
  bottles: string
  heightCm: string
  widthCm: string
  depthCm: string
  weightKg: string
  editionSize: string
  remaining: string
  status: ProductStatus
  featured: boolean
}

export type FormErrors = Partial<Record<ProductField, string>>

export const EMPTY_FORM: ProductFormValues = {
  name: "",
  stoneType: "",
  color: "",
  summary: "",
  story: "",
  price: "",
  bottles: "",
  heightCm: "",
  widthCm: "",
  depthCm: "",
  weightKg: "",
  editionSize: "",
  remaining: "",
  status: "draft",
  featured: false,
}

// The columns' limits (integer, numeric(10,2) for the price, numeric(6,1) for sizes and weight).
const MAX_INTEGER = 2_147_483_647
const MAX_PRICE = 99_999_999.99
const MAX_MEASURE = 99_999.9

const MEASURES = ["heightCm", "widthCm", "depthCm", "weightKg"] as const

const e = STUDIO_COPY.form.errors

const asText = (value: number | string | null) => (value === null ? "" : String(value))

export function formFromProduct(piece: AdminProduct): ProductFormValues {
  return {
    name: piece.name,
    stoneType: piece.stoneType,
    color: piece.color,
    summary: asText(piece.summary),
    story: asText(piece.story),
    price: asText(piece.price),
    bottles: asText(piece.bottles),
    heightCm: asText(piece.heightCm),
    widthCm: asText(piece.widthCm),
    depthCm: asText(piece.depthCm),
    weightKg: asText(piece.weightKg),
    editionSize: asText(piece.editionSize),
    remaining: asText(piece.remaining),
    status: piece.status,
    featured: piece.featured,
  }
}

// Floats can't hold most decimals exactly, so compare with a small tolerance (as the API does).
const hasAtMostDecimals = (value: number, places: number) => {
  const scaled = value * 10 ** places
  return Math.abs(scaled - Math.round(scaled)) < 1e-6
}

type Read = { value: number } | { error: string }

function readNumber(raw: string, { decimals, max, min }: { decimals: number; max: number; min: 0 | 1 }): Read {
  const text = raw.trim()
  if (!/^\d+(\.\d+)?$/.test(text)) return { error: e.number }
  const value = Number(text)
  if (decimals === 0 && !Number.isInteger(value)) return { error: e.whole }
  if (min === 1 && value <= 0) return { error: e.positive }
  if (value > max) return { error: e.tooLarge }
  if (decimals > 0 && !hasAtMostDecimals(value, decimals)) return { error: decimals === 2 ? e.priceDecimals : e.measureDecimals }
  return { value }
}

/** The input to send, or every field's error. */
export function readForm(values: ProductFormValues): { input: ProductInput } | { errors: FormErrors } {
  const errors: FormErrors = {}
  const text = (key: "name" | "stoneType" | "color") => {
    const value = values[key].trim()
    if (!value) errors[key] = e.required
    return value
  }
  const number = (key: "price" | "bottles" | "editionSize" | "remaining", rules: Parameters<typeof readNumber>[1]) => {
    if (!values[key].trim()) {
      errors[key] = e.required
      return 0
    }
    const read = readNumber(values[key], rules)
    if ("error" in read) {
      errors[key] = read.error
      return 0
    }
    return read.value
  }
  const measure = (key: (typeof MEASURES)[number]) => {
    if (!values[key].trim()) return null
    const read = readNumber(values[key], { decimals: 1, max: MAX_MEASURE, min: 1 })
    if ("error" in read) {
      errors[key] = read.error
      return null
    }
    return read.value
  }
  const optional = (key: "summary" | "story") => values[key].trim() || null

  const input: ProductInput = {
    name: text("name"),
    stoneType: text("stoneType"),
    color: text("color"),
    price: number("price", { decimals: 2, max: MAX_PRICE, min: 1 }),
    bottles: number("bottles", { decimals: 0, max: MAX_INTEGER, min: 1 }),
    heightCm: measure("heightCm"),
    widthCm: measure("widthCm"),
    depthCm: measure("depthCm"),
    weightKg: measure("weightKg"),
    editionSize: number("editionSize", { decimals: 0, max: MAX_INTEGER, min: 1 }),
    remaining: number("remaining", { decimals: 0, max: MAX_INTEGER, min: 0 }),
    status: values.status,
    featured: values.featured,
    summary: optional("summary"),
    story: optional("story"),
  }
  if (!errors.remaining && !errors.editionSize && input.remaining > input.editionSize) errors.remaining = e.aboveEdition
  return Object.keys(errors).length > 0 ? { errors } : { input }
}

/** The fields whose value differs from the saved piece: what a PATCH sends. Empty means nothing to save. */
export function changedFields(original: AdminProduct, input: ProductInput): Partial<ProductInput> {
  const changes: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input) as [keyof ProductInput, unknown][]) {
    const saved = original[key] ?? null
    if ((value ?? null) !== saved) changes[key] = value
  }
  return changes as Partial<ProductInput>
}

const sameValues = (a: ProductFormValues, b: ProductFormValues) =>
  (Object.keys(a) as (keyof ProductFormValues)[]).every((key) => {
    const [x, y] = [a[key], b[key]]
    return typeof x === "string" && typeof y === "string" ? x.trim() === y.trim() : x === y
  })

/** Whether the form holds anything unsaved: against the saved piece as the API would see it, or the empty form. */
export function hasChanges(values: ProductFormValues, saved: AdminProduct | null): boolean {
  if (!saved) return !sameValues(values, EMPTY_FORM)
  const read = readForm(values)
  return "input" in read ? Object.keys(changedFields(saved, read.input)).length > 0 : !sameValues(values, formFromProduct(saved))
}
