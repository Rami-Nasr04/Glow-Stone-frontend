import { imageSrcSet, imageUrl } from "@/lib/images"
import { cn } from "@/lib/utils"

interface PictureProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height"> {
  imageKey: string
  /** Width of the widest generated variant (2048 for product photos, 2880 for craft photos). */
  width: number
  height: number
  alt: string
  /** CSS sizes hint, e.g. "(min-width: 1024px) 50vw, 100vw". */
  sizes: string
  /** "contain" for product photos (a piece is never cropped); "cover" only for craft close-ups. */
  fit?: "contain" | "cover"
  priority?: boolean
}

export default function Picture({
  imageKey,
  width,
  height,
  alt,
  sizes,
  fit = "contain",
  priority = false,
  className,
  ...props
}: PictureProps) {
  return (
    <img
      src={imageUrl(imageKey, 960)}
      srcSet={imageSrcSet(imageKey, width)}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("block h-full w-full", fit === "contain" ? "object-contain" : "object-cover", className)}
      {...props}
    />
  )
}
