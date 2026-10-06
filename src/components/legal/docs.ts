// The three legal pages, at /legal/<doc>. Their text is in m.legal.docs (site_content in B6).
export const LEGAL_DOCS = ["terms", "privacy", "delivery"] as const
export type LegalDoc = (typeof LEGAL_DOCS)[number]

export function isLegalDoc(value: string | undefined): value is LegalDoc {
  return LEGAL_DOCS.some((doc) => doc === value)
}
