import { type ApiImage, type BundledImage, imageSrcSet, imageUrl, photoSrcSet, photoUrl } from "@/lib/images"
import { cn } from "@/lib/utils"

interface PictureProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height"> {
  /** A bundled image by key (its width is the widest generated variant), or a product photo from the API. */
  image: BundledImage | ApiImage
  alt: string
  /** CSS sizes hint, e.g. "(min-width: 1024px) 50vw, 100vw". */
  sizes: string
  /** "contain" for product photos (a piece is never cropped); "cover" only for craft close-ups. */
  fit?: "contain" | "cover"
  priority?: boolean
}

export default function Picture({ image, alt, sizes, fit = "contain", priority = false, className, ...props }: PictureProps) {
  const fromApi = "url" in image
  return (
    <img
      src={fromApi ? photoUrl(image, 960) : imageUrl(image.key, 960)}
      srcSet={fromApi ? photoSrcSet(image) : imageSrcSet(image.key, image.width)}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("block h-full w-full", fit === "contain" ? "object-contain" : "object-cover", className)}
      {...props}
    />
  )
}
