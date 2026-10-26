import { useState } from "react"
import Picture from "@/components/media/Picture"
import { noBreak, placard } from "@/features/catalog/format"
import NoPhoto from "@/features/catalog/NoPhoto"
import type { Product } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

interface GalleryProps {
  piece: Product
}

// 4:5 frame, never taller than the viewport minus the header; the photo is contained on stone, never cropped.
const frame = "relative mx-auto block aspect-4/5 overflow-hidden h-[min(70vh,760px,calc(100svh-9rem))] max-w-full bg-background"
// Both galleries load their first photo eagerly, and CSS hides one. With the same sizes they ask for the same file,
// so the hidden one costs no download.
const PHOTO_SIZES = "(min-width: 1024px) 45vw, 100vw"

export default function Gallery({ piece }: GalleryProps) {
  const { m } = useLocale()
  const [selected, setSelected] = useState(0)
  const [shown, setShown] = useState(0)
  const images = piece.images
  const current = images[selected] ?? images[0]
  // The API has no alt text: every photo is named from the piece.
  const altOf = (i: number) => interpolate(m.catalog.photoAlt, { name: piece.name, stone: piece.stoneType.toLowerCase(), n: i + 1, total: images.length })

  const many = images.length > 1
  const grey = piece.soldOut && "grayscale-60"
  const main = current ? (
    <Picture image={current} alt={altOf(images.indexOf(current))} sizes={PHOTO_SIZES} priority className={cn(grey)} />
  ) : (
    <NoPhoto />
  )

  const onSwipe = (e: React.UIEvent<HTMLUListElement>) => {
    const strip = e.currentTarget
    if (strip.clientWidth > 0) setShown(Math.round(Math.abs(strip.scrollLeft) / strip.clientWidth))
  }

  return (
    <>
      <div data-gallery="desktop" className="hidden flex-col gap-3.5 lg:flex">
        {many ? (
          <button type="button" aria-label={m.product.nextPhoto} onClick={() => setSelected((selected + 1) % images.length)} className={frame}>
            {main}
          </button>
        ) : (
          <div className={frame}>{main}</div>
        )}
        {many && (
          <ul className="flex flex-wrap justify-center gap-2.5">
            {images.map((image, i) => (
              <li key={image.url}>
                <button
                  type="button"
                  aria-label={altOf(i)}
                  aria-pressed={i === selected}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "block aspect-4/5 w-14 overflow-hidden border-b bg-background transition-[opacity,border-color] duration-500",
                    i === selected ? "border-accent opacity-100" : "border-transparent opacity-60 hover:opacity-100",
                  )}
                >
                  <Picture image={image} alt="" sizes="56px" className={cn(grey)} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-center text-label uppercase tracking-caps text-muted-foreground">
          {noBreak(piece.name)} — {placard(piece, m)}
        </p>
      </div>

      <div data-gallery="mobile" className="relative -mx-gutter lg:hidden">
        <ul
          onScroll={onSwipe}
          aria-label={interpolate(m.product.photos, { name: piece.name })}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <li key={image.url} className="aspect-2/3 w-full shrink-0 snap-start overflow-hidden bg-background">
              <Picture image={image} alt={altOf(i)} sizes={PHOTO_SIZES} priority={i === 0} className={cn(grey)} />
            </li>
          ))}
          {!current && (
            <li className="aspect-2/3 w-full shrink-0 overflow-hidden">
              <NoPhoto />
            </li>
          )}
        </ul>
        {many && (
          <p className="absolute end-4 bottom-4 bg-background px-3 py-2 text-xs tracking-caps">
            {interpolate(m.product.counter, { n: shown + 1, total: images.length })}
          </p>
        )}
      </div>
    </>
  )
}
