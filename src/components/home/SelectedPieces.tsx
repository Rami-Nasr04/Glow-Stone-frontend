import { MoveLeft, MoveRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { Eyebrow } from "@/components/ui/rule"
import { listProducts } from "@/features/catalog/catalog"
import PieceCard from "@/features/catalog/PieceCard"
import { useLocale } from "@/i18n/useLocale"
import { scrollBehavior } from "@/lib/motion"
import { cn } from "@/lib/utils"

const CARD_SIZES = "(min-width: 768px) clamp(280px, 25vw, 360px), 72vw"
const arrowButton =
  "hidden size-12 items-center justify-center rounded-full border border-primary transition-[opacity,background-color,color] duration-500 hover:bg-primary hover:text-primary-foreground disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-foreground md:flex"
const arrowIcon = "size-4.5 rtl:-scale-x-100"

interface DragState {
  x: number
  left: number
  moved: boolean
}

export default function SelectedPieces() {
  const { m, to } = useLocale()
  // Featured pieces, newest first like the collection.
  const pieces = listProducts().filter((p) => p.featured)
  const railRef = useRef<HTMLUListElement>(null)
  const drag = useRef<DragState | null>(null)
  const swallowClick = useRef(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const [dragging, setDragging] = useState(false)

  const updateEnds = () => {
    const rail = railRef.current
    if (!rail) return
    const offset = Math.abs(rail.scrollLeft) // negative on right-to-left pages
    setAtStart(offset <= 4)
    setAtEnd(offset + rail.clientWidth >= rail.scrollWidth - 4)
  }

  useEffect(() => {
    updateEnds()
    window.addEventListener("resize", updateEnds)
    return () => window.removeEventListener("resize", updateEnds)
  }, [])

  const step = (direction: 1 | -1) => {
    const rail = railRef.current
    const card = rail?.firstElementChild
    if (!rail || !card) return
    const style = getComputedStyle(rail)
    const gap = Number.parseFloat(style.columnGap) || 0
    const inline = style.direction === "rtl" ? -1 : 1
    rail.scrollBy({ left: direction * inline * (card.getBoundingClientRect().width + gap), behavior: scrollBehavior() })
  }

  // Mouse users can drag the rail; touch scrolls natively. A drag never opens the card under the pointer.
  const onPointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse" || !railRef.current) return
    drag.current = { x: e.clientX, left: railRef.current.scrollLeft, moved: false }
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLUListElement>) => {
    if (!drag.current || !railRef.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 5) drag.current.moved = true
    railRef.current.scrollLeft = drag.current.left - dx
  }
  const endDrag = () => {
    if (!drag.current) return
    swallowClick.current = drag.current.moved
    drag.current = null
    setDragging(false)
  }
  const onClickCapture = (e: React.MouseEvent) => {
    if (!swallowClick.current) return
    e.preventDefault()
    e.stopPropagation()
    swallowClick.current = false
  }

  return (
    <section aria-labelledby="selected-pieces" className="pt-section pb-[calc(var(--spacing-section)+var(--spacing-straddle))]">
      <div className="mb-[clamp(2rem,4vw,3rem)] flex items-end justify-between gap-6 px-5 lg:px-12">
        <Eyebrow as="h2" id="selected-pieces">
          {m.home.selectedPieces}
        </Eyebrow>
        <div className="flex items-center gap-2">
          <Link
            to={to("/collection")}
            className="me-4 flex min-h-11 items-center text-label uppercase tracking-label whitespace-nowrap transition-colors duration-500 hover:text-accent"
          >
            {m.home.viewAll}
          </Link>
          <button type="button" onClick={() => step(-1)} disabled={atStart} aria-label={m.home.previousPieces} className={arrowButton}>
            <MoveLeft aria-hidden="true" strokeWidth={1.1} className={arrowIcon} />
          </button>
          <button type="button" onClick={() => step(1)} disabled={atEnd} aria-label={m.home.nextPieces} className={arrowButton}>
            <MoveRight aria-hidden="true" strokeWidth={1.1} className={arrowIcon} />
          </button>
        </div>
      </div>

      <ul
        ref={railRef}
        onScroll={updateEnds}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-ps-5 ps-5 pe-5 pb-2 [scrollbar-width:none] md:cursor-grab md:gap-6 lg:scroll-ps-12 lg:ps-12 lg:pe-12 [&::-webkit-scrollbar]:hidden",
          dragging && "cursor-grabbing snap-none select-none",
        )}
      >
        {pieces.map((piece) => (
          <li key={piece.id} className="w-[72vw] shrink-0 snap-start md:w-[clamp(280px,25vw,360px)]">
            <PieceCard product={piece} sizes={CARD_SIZES} compact />
          </li>
        ))}
      </ul>
    </section>
  )
}
