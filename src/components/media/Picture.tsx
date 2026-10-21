import { type ApiImage, type BundledImage, capPhoneDensity, imageSrcSet, imageUrl, photoSrcSet, photoUrl } from "@/lib/images"
import { cn } from "@/lib/utils"

interface PictureProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height"> {
  /** A bundled image by key (its width is the widest generated variant), or a product photo from the API. */
  image: BundledImage | ApiImage
  alt: string
  /** CSS sizes hint, e.g. "(min-width: 1024px) 50vw, 100vw". Dense phone screens get 2/3 of the last width (capPhoneDensity). */
  sizes: string
  /** "contain" for product photos (a piece is never cropped); "cover" only for craft close-ups. */
  fit?: "contain" | "cover"
  priority?: boolean
  /** Download the photo only where this media query matches (e.g. "(hover: hover)"); elsewhere the img stays empty. */
  media?: string
}

// A transparent 1×1 GIF: what the img shows where `media` doesn't match, so nothing is downloaded.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="

export default function Picture({ image, alt, sizes, fit = "contain", priority = false, media, className, ...props }: PictureProps) {
  const fromApi = "url" in image
  const src = fromApi ? photoUrl(image, 960) : imageUrl(image.key, 960)
  const srcSet = fromApi ? photoSrcSet(image) : imageSrcSet(image.key, image.width)
  const img = (
    <img
      src={media ? BLANK : src}
      srcSet={media ? undefined : srcSet}
      sizes={media ? undefined : capPhoneDensity(sizes)}
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
  if (!media) return img
  return (
    <picture>
      <source media={media} srcSet={srcSet} sizes={capPhoneDensity(sizes)} />
      {img}
    </picture>
  )
}
