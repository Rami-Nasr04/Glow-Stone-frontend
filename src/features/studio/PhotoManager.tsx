import { ChevronLeft, ChevronRight, Plus, Star, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { AdminProductImage } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import { photoUrl } from "@/lib/images"
import { cn } from "@/lib/utils"
import { StudioError } from "./admin-api"
import { useAdminAuth } from "./auth/admin-auth-context"
import ConfirmDialog from "./ConfirmDialog"
import { STUDIO_COPY } from "./copy"
import { clearPendingPhotos, readPendingPhotos, savePendingPhotos } from "./drafts"
import { panel, panelTitle } from "./panel"
import { addPhotos, PHOTO_ACCEPT } from "./photos"

interface PhotoManagerProps {
  /** The saved piece's id, or null for a piece that isn't created yet. */
  productId: number | null
  initial: AdminProductImage[]
  /** True while a batch of photos is being added (the editor then asks before leaving). */
  onUploadingChange: (uploading: boolean) => void
  /** How many photos the piece has now (the editor's delete question names it). */
  onCountChange: (count: number) => void
}

type Action = "earlier" | "later" | "cover" | "delete"

const p = STUDIO_COPY.photos
// When a photo's own button is off after a move (it became the first or the last), the focus goes to the next one.
const FOCUS_ORDER: Action[] = ["earlier", "later", "cover", "delete"]

interface PhotoToolProps {
  photoId: number
  action: Action
  label: string
  /** The move isn't possible here (the first photo can't go earlier). */
  off: boolean
  /** Another change is being saved: the press is ignored, but the focus stays. */
  busy: boolean
  onPress: () => void
  children: React.ReactNode
}

function PhotoTool({ photoId, action, label, off, busy, onPress, children }: PhotoToolProps) {
  return (
    <button
      type="button"
      data-photo={photoId}
      data-action={action}
      aria-label={label}
      title={label}
      disabled={off}
      aria-disabled={busy || undefined}
      onClick={onPress}
      className="flex min-h-11 items-center justify-center transition-colors duration-500 hover:bg-background/60 disabled:opacity-25 aria-disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function labelOf(i: number, count: number): string {
  const label = interpolate(p.label, { n: i + 1, count })
  return i === 0 ? `${label}, ${p.cover}` : i === 1 ? `${label}, ${p.hover}` : label
}

// The piece's photos: add (several, one at a time), move earlier or later, make the cover, delete. Every change goes
// to the API at once (there's no Save for photos); the server's answer is what the screen shows. Buttons, not drag,
// so it works the same on a phone and from the keyboard.
export default function PhotoManager({ productId, initial, onUploadingChange, onCountChange }: PhotoManagerProps) {
  const { api } = useAdminAuth()
  const [photos, setPhotos] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [news, setNews] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [failed, setFailed] = useState<{ name: string; message: string }[]>([])
  const [deleting, setDeleting] = useState<number | null>(null)
  const [notAdded] = useState(() => (productId === null ? null : readPendingPhotos(productId)))

  const latest = useRef(photos)
  const working = useRef(false)
  const left = useRef(false)
  const focusNext = useRef<{ id: number | null; action: Action } | null>(null)
  const list = useRef<HTMLOListElement>(null)
  const addInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    latest.current = photos
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    if (target.id === null) return addInput.current?.focus()
    for (const action of [target.action, ...FOCUS_ORDER]) {
      const button = list.current?.querySelector<HTMLButtonElement>(`[data-photo="${target.id}"][data-action="${action}"]`)
      if (button && !button.disabled) return button.focus()
    }
  }, [photos])

  useEffect(() => onCountChange(photos.length), [photos.length, onCountChange])

  // The names were shown once (above); a later visit doesn't repeat them.
  useEffect(() => {
    if (notAdded) clearPendingPhotos()
  }, [notAdded])

  // Leaving the page stops a batch before its next photo.
  useEffect(() => {
    left.current = false
    return () => {
      left.current = true
    }
  }, [])

  if (productId === null) {
    return (
      <section aria-labelledby="photos-title" className={panel}>
        <h2 id="photos-title" className={panelTitle}>
          {STUDIO_COPY.form.photos}
        </h2>
        <p className="text-sm text-muted-foreground">{p.saveFirst}</p>
      </section>
    )
  }

  const reload = async () => (await api.getProduct(productId)).images

  // One change at a time: a second tap while the first is being saved is ignored.
  const start = () => {
    if (working.current) return false
    working.current = true
    setBusy(true)
    setProblem(null)
    setNews(null)
    setFailed([])
    return true
  }
  const finish = () => {
    working.current = false
    setBusy(false)
  }

  // A change the server refused because the photos changed meanwhile: show its latest photos.
  const refresh = async (message: string) => {
    try {
      setPhotos(await reload())
      return message
    } catch {
      return null
    }
  }

  const move = async (from: number, to: number, action: Action) => {
    if (!start()) return
    const order = [...latest.current]
    const [moved] = order.splice(from, 1)
    order.splice(to, 0, moved)
    focusNext.current = { id: moved.id, action }
    try {
      setPhotos(await api.reorderPhotos(productId, order.map((photo) => photo.id)))
      setNews(action === "cover" ? interpolate(p.madeCover, { from: from + 1 }) : interpolate(p.moved, { from: from + 1, to: to + 1 }))
    } catch (error) {
      focusNext.current = null
      if (error instanceof StudioError && error.status === 401) return
      if (error instanceof StudioError && error.code === "VALIDATION") setNews(await refresh(p.changed))
      else if (error instanceof StudioError && error.code === "NOT_FOUND") setProblem((await refresh(error.message)) ?? error.message)
      else setProblem(p.orderFailed)
    } finally {
      finish()
    }
  }

  const remove = async (id: number) => {
    if (!start()) return
    const index = latest.current.findIndex((photo) => photo.id === id)
    try {
      await api.deletePhoto(productId, id)
      const rest = latest.current.filter((photo) => photo.id !== id).map((photo, i) => ({ ...photo, position: i + 1 }))
      focusNext.current = { id: (rest[index] ?? rest[index - 1])?.id ?? null, action: "delete" }
      setPhotos(rest)
      setNews(interpolate(p.deleted, { n: index + 1 }))
    } catch (error) {
      if (error instanceof StudioError && error.status === 401) return
      if (error instanceof StudioError && (error.code === "NOT_FOUND" || error.code === "VALIDATION")) setProblem((await refresh(error.message)) ?? error.message)
      else setProblem(p.deleteFailed)
    } finally {
      finish()
    }
  }

  const askDelete = (id: number) => {
    if (!working.current) setDeleting(id)
  }

  const add = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    // Cleared, so the same photo can be chosen again after a failure.
    event.target.value = ""
    if (files.length === 0 || !start()) return
    onUploadingChange(true)
    // Kept here as well as on screen: a reload during the batch must not count a photo twice.
    const known = new Set(latest.current.map((photo) => photo.id))
    const result = await addPhotos(api, productId, files, {
      onProgress: (n, count) => setProgress(count === 1 ? p.adding : interpolate(p.addingOf, { n, count })),
      onAdded: (photo) => {
        known.add(photo.id)
        setPhotos((current) => [...current, photo])
      },
      onReloaded: (reloaded) => {
        for (const photo of reloaded) known.add(photo.id)
        setPhotos(reloaded)
      },
      onPending: (names) => savePendingPhotos(productId, names),
      knownIds: () => [...known],
      reload,
      isCancelled: () => left.current,
    })
    setProgress(null)
    onUploadingChange(false)
    finish()
    if (result.unauthorized || left.current) return
    setFailed(result.failed)
    if (files.length === 1) setNews(result.added.length === 1 ? p.addedOne : null)
    else setNews(interpolate(p.addedOf, { added: result.added.length, count: files.length }))
  }

  const count = photos.length
  const deletingIndex = photos.findIndex((photo) => photo.id === deleting)
  const status = progress ?? news

  return (
    <section aria-labelledby="photos-title" className={panel}>
      <h2 id="photos-title" className={panelTitle}>
        {STUDIO_COPY.form.photos}
      </h2>
      {notAdded && (
        <p role="status" className="border-y border-accent py-3 text-sm">
          {interpolate(p.notAdded, { names: notAdded.join(", ") })}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label
          className={cn(
            "relative flex min-h-11 cursor-pointer items-center gap-2 self-start border border-primary px-5 text-label uppercase tracking-caps transition-colors duration-500 has-focus-visible:outline has-focus-visible:outline-accent hover:bg-background/60",
            busy && "cursor-default opacity-50",
          )}
        >
          <input
            ref={addInput}
            type="file"
            accept={PHOTO_ACCEPT}
            multiple
            aria-describedby="photos-hint photos-saved"
            aria-disabled={busy || undefined}
            onClick={(event) => working.current && event.preventDefault()}
            onChange={add}
            // An invisible layer over the whole button (scrolling to it clears the save bar); the empty title stops
            // the browser's "No file chosen" tooltip.
            title=""
            className="absolute inset-0 size-full cursor-[inherit] opacity-0"
          />
          <Plus aria-hidden="true" className="size-4" />
          {p.add}
        </label>
        <p id="photos-hint" className="text-xs text-muted-foreground">
          {p.hint}
        </p>
        <p id="photos-saved" className="text-xs text-muted-foreground">
          {p.saved}
        </p>
      </div>

      <p role="status" className={cn("text-sm", !status && "sr-only")}>
        {status}
      </p>
      {(problem || failed.length > 0) && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-destructive">
          {problem && <p>{problem}</p>}
          {failed.length > 0 && (
            <>
              <p>{p.notAddedTitle}</p>
              <ul className="flex flex-col gap-1">
                {failed.map((failure, i) => (
                  <li key={`${failure.name}-${i}`}>{`${failure.name}: ${failure.message}`}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{p.none}</p>
      ) : (
        <ol ref={list} className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
          {photos.map((photo, i) => {
            const n = { n: i + 1 }
            return (
              <li key={photo.id} className="flex flex-col">
                <div className="relative aspect-2/3 overflow-hidden bg-muted">
                  <img
                    src={photoUrl(photo, 480)}
                    alt={labelOf(i, count)}
                    width={photo.width}
                    height={photo.height}
                    loading="lazy"
                    className="size-full object-contain"
                  />
                  <span aria-hidden="true" className="absolute start-1.5 top-1.5 bg-studio-panel px-1.75 py-0.5 text-xs">
                    {i === 0 ? p.cover : i === 1 ? p.hover : i + 1}
                  </span>
                </div>
                <div className="grid grid-cols-2 border border-t-0 border-border sm:grid-cols-4">
                  <PhotoTool photoId={photo.id} action="earlier" label={interpolate(p.earlier, n)} off={i === 0} busy={busy} onPress={() => void move(i, i - 1, "earlier")}>
                    <ChevronLeft aria-hidden="true" className="size-4.5" />
                  </PhotoTool>
                  <PhotoTool photoId={photo.id} action="later" label={interpolate(p.later, n)} off={i === count - 1} busy={busy} onPress={() => void move(i, i + 1, "later")}>
                    <ChevronRight aria-hidden="true" className="size-4.5" />
                  </PhotoTool>
                  <PhotoTool photoId={photo.id} action="cover" label={interpolate(p.makeCover, n)} off={i === 0} busy={busy} onPress={() => void move(i, 0, "cover")}>
                    <Star aria-hidden="true" className="size-4" />
                  </PhotoTool>
                  <PhotoTool photoId={photo.id} action="delete" label={interpolate(p.delete, n)} off={false} busy={busy} onPress={() => askDelete(photo.id)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </PhotoTool>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={interpolate(p.confirmTitle, { n: deletingIndex + 1 })}
        text={p.confirmText}
        keep={p.keep}
        confirm={p.confirmDelete}
        onKeep={() => setDeleting(null)}
        onConfirm={() => {
          const id = deleting
          setDeleting(null)
          if (id !== null) void remove(id)
        }}
      />
    </section>
  )
}
