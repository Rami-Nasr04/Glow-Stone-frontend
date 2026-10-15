import type { ProductStatus } from "@/features/catalog/types"
import { cn } from "@/lib/utils"
import { STUDIO_COPY } from "./copy"

interface StatusBadgeProps {
  status: ProductStatus
}

// Published is solid charcoal, Draft is dashed; each carries a mark and a word, never colour alone.
export default function StatusBadge({ status }: StatusBadgeProps) {
  const published = status === "published"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 justify-self-start border px-2.25 py-1 text-label uppercase tracking-[0.14em]",
        published ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-muted-foreground text-muted-foreground",
      )}
    >
      <span aria-hidden="true">{published ? "●" : "◇"}</span>
      <span>{published ? STUDIO_COPY.list.published : STUDIO_COPY.list.draft}</span>
    </span>
  )
}
