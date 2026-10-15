import type { MetaDescriptor } from "react-router"
import { STUDIO_COPY } from "./copy"

// Every studio page: its own title and never indexed, whatever VITE_ALLOW_INDEXING says (a child route's meta
// replaces its parent's, so each page carries the tag).
export function studioMeta(title?: string): MetaDescriptor[] {
  return [{ title: title ? `${title} — ${STUDIO_COPY.metaTitle}` : STUDIO_COPY.metaTitle }, { name: "robots", content: "noindex, nofollow" }]
}
