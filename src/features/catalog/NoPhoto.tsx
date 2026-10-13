import { cn } from "@/lib/utils"

interface NoPhotoProps {
  className?: string
}

// A piece without a photo yet (Omar adds them in the studio): the plain stone frame with the monogram.
export default function NoPhoto({ className }: NoPhotoProps) {
  return (
    <div data-no-photo className={cn("flex size-full items-center justify-center bg-card", className)}>
      <img src="/brand/glowstone-monogram.svg" alt="" width={36} height={36} className="size-9 opacity-40" />
    </div>
  )
}
