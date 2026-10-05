import { cn } from "@/lib/utils"

interface RuleProps {
  /** Charcoal sections use the lighter wine; wine itself is too dark there. */
  onDark?: boolean
  className?: string
}

export function Rule({ onDark = false, className }: RuleProps) {
  return <span aria-hidden="true" className={cn("block h-px w-12", onDark ? "bg-wine-on-dark" : "bg-accent", className)} />
}

interface EyebrowProps {
  children: React.ReactNode
  as?: "h2" | "p"
  id?: string
  onDark?: boolean
  className?: string
}

// The small-capitals label and wine rule that open most sections.
export function Eyebrow({ children, as: Tag = "p", id, onDark = false, className }: EyebrowProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Tag id={id} className="text-label uppercase tracking-label">
        {children}
      </Tag>
      <Rule onDark={onDark} />
    </div>
  )
}
