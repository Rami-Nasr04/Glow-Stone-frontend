import { cva, type VariantProps } from "class-variance-authority"
import { MoveRight } from "lucide-react"
import { Link, type LinkProps } from "react-router"
import { cn } from "@/lib/utils"

export const actionVariants = cva(
  "inline-flex items-center justify-center gap-4.5 uppercase tracking-label transition-colors duration-500 ease-slow",
  {
    variants: {
      variant: {
        solid: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border border-primary text-foreground hover:bg-primary hover:text-primary-foreground",
        outlineOnDark:
          "border border-dark-section-foreground text-dark-section-foreground hover:bg-dark-section-foreground hover:text-dark-section",
        onPhoto: "border border-background text-on-photo",
      },
      size: {
        md: "min-h-14 px-7 text-label",
        lg: "min-h-15 px-8.5 text-xs",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
)

interface ActionLinkProps extends LinkProps, VariantProps<typeof actionVariants> {
  arrow?: boolean
}

export function ActionLink({ variant, size, arrow = true, className, children, ...props }: ActionLinkProps) {
  return (
    <Link className={cn(actionVariants({ variant, size }), className)} {...props}>
      {children}
      {arrow && <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />}
    </Link>
  )
}
