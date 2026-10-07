// Also loaded by the build config in Node (src/i18n/paths.ts), so no "@/" imports here.

// "Sannine · Sand" → "sannine-sand": only there to make the address readable; pages find a piece by its id.
export function readableName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function productPath(product: { id: number; name: string }): string {
  return `/collection/${product.id}/${readableName(product.name)}`
}

// The id part of /collection/<id>/<name>; anything that isn't a whole positive number is no product.
export function parseProductId(raw: string | undefined): number | null {
  if (!raw || !/^[1-9]\d{0,8}$/.test(raw)) return null
  return Number(raw)
}
