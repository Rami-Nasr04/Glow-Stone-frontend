import type { ProductStatus } from "@/features/catalog/types"
import { cn } from "@/lib/utils"
import { STUDIO_COPY } from "./copy"
import type { OrderStatus } from "./orders"

interface StatusBadgeProps {
  status: ProductStatus | OrderStatus
}

// Each status carries a mark and a word, never colour alone (the prototype's badges). Products: Published is solid
// charcoal, Draft dashed. Orders: Pending outlined, Confirmed solid, Out for delivery in wine, Delivered on a muted
// fill, Cancelled dashed.
const BADGES: Record<ProductStatus | OrderStatus, { mark: string; label: string; look: string }> = {
  published: { mark: "●", label: STUDIO_COPY.list.published, look: "border-primary bg-primary text-primary-foreground" },
  draft: { mark: "◇", label: STUDIO_COPY.list.draft, look: "border-dashed border-muted-foreground text-muted-foreground" },
  pending: { mark: "○", label: STUDIO_COPY.status.pending, look: "border-primary text-foreground" },
  confirmed: { mark: "●", label: STUDIO_COPY.status.confirmed, look: "border-primary bg-primary text-primary-foreground" },
  out_for_delivery: { mark: "→", label: STUDIO_COPY.status.out_for_delivery, look: "border-accent text-accent" },
  delivered: { mark: "✓", label: STUDIO_COPY.status.delivered, look: "border-border bg-muted text-foreground" },
  cancelled: { mark: "×", label: STUDIO_COPY.status.cancelled, look: "border-dashed border-muted-foreground text-muted-foreground" },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const badge = BADGES[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 justify-self-start border px-2.25 whitespace-nowrap py-1 text-label uppercase tracking-[0.14em]", badge.look)}>
      <span aria-hidden="true">{badge.mark}</span>
      <span>{badge.label}</span>
    </span>
  )
}
