import { ArrowDown, ArrowUp, GripVertical } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { AdminProduct } from "@/features/catalog/types"
import NoPhoto from "@/features/catalog/NoPhoto"
import { interpolate } from "@/i18n/format"
import { photoUrl } from "@/lib/images"
import { cn } from "@/lib/utils"
import { STUDIO_COPY } from "./copy"
import StatusBadge from "./StatusBadge"

const t = STUDIO_COPY.arrange

interface ArrangeListProps {
  pieces: AdminProduct[]
  saving: boolean
  /** The ids, first to last, when Omar presses Save order. */
  onSave: (productIds: number[]) => void
  onCancel: () => void
}

function moved<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// Omar's order of the collection (contract, "Arrange the pieces", 2026-11-02). Each row moves by its handle (a finger
// on iPhone, or a mouse: pointer events, with the page kept from scrolling under the finger), by the arrows, or by the
// arrow keys on the handle. The numbers show the place each piece will take; nothing is sent until Save order. The page
// gives it a new key when the list is read again, so arranging starts over.
export default function ArrangeList({ pieces, saving, onSave, onCancel }: ArrangeListProps) {
  const [order, setOrder] = useState(pieces)
  const [said, setSaid] = useState("")
  const [dragging, setDragging] = useState<number | null>(null)
  const rows = useRef(new Map<number, HTMLLIElement>())
  // The order as the drag sees it between renders (moveTo keeps it current at once).
  const orderRef = useRef(order)
  useLayoutEffect(() => {
    orderRef.current = order
  }, [order])

  const changed = order.some((piece, i) => piece.id !== pieces[i]?.id)

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= orderRef.current.length || to === from) return
    const next = moved(orderRef.current, from, to)
    orderRef.current = next
    setOrder(next)
    setSaid(interpolate(t.moved, { name: next[to].name, position: to + 1, total: next.length }))
  }

  // While a handle is held, the piece takes the place of the row under the pointer.
  useEffect(() => {
    if (dragging === null) return
    const onMove = (event: PointerEvent) => {
      const list = orderRef.current
      const from = list.findIndex((piece) => piece.id === dragging)
      const to = list.findIndex((piece) => {
        const box = rows.current.get(piece.id)?.getBoundingClientRect()
        return box !== undefined && event.clientY >= box.top && event.clientY < box.bottom
      })
      if (from !== -1 && to !== -1) moveTo(from, to)
    }
    const onEnd = () => setDragging(null)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onEnd)
    window.addEventListener("pointercancel", onEnd)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onEnd)
      window.removeEventListener("pointercancel", onEnd)
    }
  }, [dragging])

  const tool = "flex size-11 items-center justify-center text-muted-foreground transition-colors duration-300 enabled:hover:text-foreground disabled:opacity-30"

  return (
    <section aria-labelledby="arrange-title" className="flex flex-col gap-4 border border-border bg-studio-panel p-5">
      <div className="flex flex-col gap-1.5">
        <h2 id="arrange-title" className="font-display text-2xl font-light">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.hint}</p>
      </div>
      <ol aria-label={t.listLabel} className="flex flex-col border-t border-border">
        {order.map((piece, i) => {
          const cover = piece.images[0]
          return (
            <li
              key={piece.id}
              ref={(row) => {
                if (row) rows.current.set(piece.id, row)
                else rows.current.delete(piece.id)
              }}
              className={cn(
                "flex items-center gap-2 border-b border-border py-1.5 transition-colors duration-200 sm:gap-3",
                dragging === piece.id && "bg-studio-surface",
              )}
            >
              <span data-position className="w-7 shrink-0 text-center font-display text-xl text-accent">
                {i + 1}
              </span>
              <button
                type="button"
                aria-label={interpolate(t.drag, { name: piece.name })}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.currentTarget.setPointerCapture?.(event.pointerId)
                  setDragging(piece.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault()
                    moveTo(i, event.key === "ArrowUp" ? i - 1 : i + 1)
                  }
                }}
                className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
              >
                <GripVertical aria-hidden="true" className="size-5" />
              </button>
              <span className="block h-12 w-8 shrink-0 overflow-hidden bg-muted">
                {cover ? (
                  <img src={photoUrl(cover, 480)} alt="" width={cover.width} height={cover.height} loading="lazy" className="size-full object-contain" />
                ) : (
                  <NoPhoto />
                )}
              </span>
              <span data-name className="min-w-0 flex-1 truncate font-display text-xl leading-tight">
                {piece.name}
              </span>
              <span className="hidden sm:block">
                <StatusBadge status={piece.status} />
              </span>
              <button type="button" aria-label={interpolate(t.up, { name: piece.name })} disabled={i === 0} onClick={() => moveTo(i, i - 1)} className={tool}>
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={interpolate(t.down, { name: piece.name })}
                disabled={i === order.length - 1}
                onClick={() => moveTo(i, i + 1)}
                className={tool}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
            </li>
          )
        })}
      </ol>
      <p role="status" aria-label={t.announcer} className="sr-only">
        {said}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!changed || saving}
          onClick={() => onSave(order.map((piece) => piece.id))}
          className="flex min-h-11 items-center bg-primary px-6 text-label uppercase tracking-caps text-primary-foreground transition-colors duration-500 enabled:hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? t.saving : t.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex min-h-11 items-center border border-primary px-6 text-label uppercase tracking-caps transition-colors duration-500 hover:bg-primary hover:text-primary-foreground"
        >
          {t.cancel}
        </button>
      </div>
    </section>
  )
}
