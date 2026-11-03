import { BRAND_ICON } from "@/config/icons"
import { cn } from "@/lib/utils"

interface BrandIconProps {
  /** The white S, for dark backgrounds. */
  onDark?: boolean
  /** Give it a height (h-9…); the width follows the stone's shape. */
  className?: string
}

// Omar's S icon, as a decoration beside text that already names Glowstone.
export default function BrandIcon({ onDark = false, className }: BrandIconProps) {
  return <img src={onDark ? BRAND_ICON.onDark : BRAND_ICON.onLight} alt="" width={BRAND_ICON.width} height={BRAND_ICON.height} className={cn("w-auto", className)} />
}
