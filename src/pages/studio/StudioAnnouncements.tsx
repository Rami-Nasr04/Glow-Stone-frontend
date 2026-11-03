import { useCallback, useEffect, useRef, useState } from "react"
import { Field, inputClass } from "@/components/ui/field"
import NoPhoto from "@/features/catalog/NoPhoto"
import type { AdminProduct } from "@/features/catalog/types"
import { StudioError } from "@/features/studio/admin-api"
import { type Announcement, type AnnouncementDraft, paragraphsOf } from "@/features/studio/announcements"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import ConfirmDialog from "@/features/studio/ConfirmDialog"
import { STUDIO_COPY } from "@/features/studio/copy"
import { formatDay } from "@/features/studio/orders"
import { panel, panelTitle } from "@/features/studio/panel"
import { studioToast } from "@/features/studio/toast"
import { interpolate } from "@/i18n/format"
import { photoUrl } from "@/lib/images"
import { cn } from "@/lib/utils"

const t = STUDIO_COPY.announcements

type Load = { state: "loading" } | { state: "failed" } | { state: "ready"; subscribers: number; announcements: Announcement[]; pieces: AdminProduct[] }

const EMPTY: AnnouncementDraft = { subject: "", message: "", productId: null }

const action = "flex min-h-11 items-center px-6 text-label uppercase tracking-caps transition-colors duration-500 disabled:opacity-60"

// The API's own words when it gave some; otherwise (no connection, an answer we couldn't read) our fallback.
function messageOf(error: unknown, fallback: string): string | null {
  if (error instanceof StudioError && error.status === 401) return null
  if (error instanceof StudioError && error.code !== "NETWORK" && error.code !== "UNEXPECTED" && !/^(GET|POST) \//.test(error.message)) return error.message
  return fallback
}

// Omar writes to the news list (contract "Announcements", 2026-11-03). A test goes to him alone; "Send to all" asks
// first, then sends once: the requestId is made for this announcement and kept for every retry of it, so a double tap
// or a lost answer can never send it twice. A new one gets a new id (after a send, or "Start a new one").
export default function StudioAnnouncements() {
  const { api } = useAdminAuth()
  const [load, setLoad] = useState<Load>({ state: "loading" })
  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY)
  const [busy, setBusy] = useState<"test" | "send" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [reading, setReading] = useState<number | null>(null)
  // This announcement's id for the API, made at its first "Send to all" and kept for every retry of it.
  const [requestId, setRequestId] = useState<string | null>(null)
  // Set before any await, so a second tap in the same moment finds it taken.
  const working = useRef(false)

  const fetchAll = useCallback(
    () =>
      Promise.all([api.listAnnouncements(), api.listProducts()]).then(
        ([list, pieces]): Load => ({ state: "ready", ...list, pieces }),
        (): Load => ({ state: "failed" }),
      ),
    [api],
  )

  useEffect(() => {
    let live = true
    void fetchAll().then((next) => live && setLoad(next))
    return () => {
      live = false
    }
  }, [fetchAll])

  const retry = () => {
    setLoad({ state: "loading" })
    void fetchAll().then(setLoad)
  }

  const set = <K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const startNew = () => {
    setDraft(EMPTY)
    setError(null)
    setRequestId(null)
  }

  async function run(kind: "test" | "send") {
    if (working.current) return
    working.current = true
    setBusy(kind)
    setError(null)
    try {
      if (kind === "test") {
        const sentTo = await api.sendTestAnnouncement(draft)
        studioToast.success(interpolate(t.testSent, { sentTo }))
      } else {
        const id = requestId ?? crypto.randomUUID()
        setRequestId(id)
        const sent = await api.sendAnnouncement(id, draft)
        studioToast.success(sent.recipients === 1 ? t.sentOne : interpolate(t.sent, { count: sent.recipients }))
        startNew()
        const list = await api.listAnnouncements().catch(() => null)
        setLoad((current) =>
          current.state !== "ready" ? current : list ? { ...current, ...list } : { ...current, announcements: [sent, ...current.announcements.filter((a) => a.id !== sent.id)] },
        )
      }
    } catch (caught) {
      const message = messageOf(caught, kind === "test" ? t.testFailed : t.failed)
      if (message) {
        setError(message)
        studioToast.error(message)
      }
    } finally {
      working.current = false
      setBusy(null)
    }
  }

  if (load.state !== "ready") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{t.title}</h1>
        {load.state === "loading" ? (
          <p role="status" className="py-6 text-sm text-muted-foreground">
            {t.loading}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-4 border border-border bg-studio-panel px-5 py-4">
            <p role="alert" className="text-sm text-destructive">
              {t.loadFailed}
            </p>
            <button type="button" onClick={retry} className="min-h-11 text-label uppercase tracking-caps underline underline-offset-4">
              {t.retry}
            </button>
          </div>
        )}
      </div>
    )
  }

  const published = load.pieces.filter((piece) => piece.status === "published")
  const nameOf = (id: number | null) => (id === null ? null : (load.pieces.find((piece) => piece.id === id)?.name ?? null))
  const nobody = load.subscribers === 0
  const started = draft.subject !== "" || draft.message !== "" || draft.productId !== null || requestId !== null
  const choices: { id: number | null; name: string; piece?: AdminProduct }[] = [{ id: null, name: t.none }, ...published.map((piece) => ({ id: piece.id, name: piece.name, piece }))]

  return (
    <div className="flex max-w-200 flex-col gap-5">
      <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{t.title}</h1>

      <section aria-labelledby="compose-title" className={panel}>
        <h2 id="compose-title" className={panelTitle}>
          {t.compose}
        </h2>
        <Field id="announcement-subject" label={t.subject}>
          {(control) => <input type="text" autoComplete="off" value={draft.subject} onChange={(e) => set("subject", e.target.value)} className={inputClass} {...control} />}
        </Field>
        <Field id="announcement-message" label={t.message} hint={<span className="text-xs text-muted-foreground">{t.messageHint}</span>}>
          {(control) => (
            <textarea
              rows={9}
              value={draft.message}
              onChange={(e) => set("message", e.target.value)}
              className="w-full resize-y border border-border bg-background/40 p-3 text-base leading-relaxed transition-colors duration-500 focus:border-accent focus:shadow-[0_0_0_1px_var(--accent)] focus:outline-none"
              {...control}
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <p id="announcement-feature" className="text-label uppercase tracking-label text-muted-foreground">
            {t.feature}
          </p>
          <div role="radiogroup" aria-labelledby="announcement-feature" aria-describedby="announcement-feature-hint" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {choices.map(({ id, name, piece }) => {
              const cover = piece?.images[0]
              return (
                <label
                  key={id ?? "none"}
                  className="flex min-h-14 cursor-pointer items-center gap-3 border border-border px-3 py-1.5 transition-colors duration-500 has-checked:border-primary has-checked:bg-background/60 has-focus-visible:outline has-focus-visible:outline-accent"
                >
                  <input type="radio" name="feature" checked={draft.productId === id} onChange={() => set("productId", id)} className="sr-only" />
                  {piece && (
                    <span className="block h-12 w-8 shrink-0 overflow-hidden bg-muted">
                      {cover ? <img src={photoUrl(cover, 480)} alt="" width={cover.width} height={cover.height} loading="lazy" className="size-full object-contain" /> : <NoPhoto />}
                    </span>
                  )}
                  <span className={cn("min-w-0 truncate", piece ? "font-display text-lg leading-tight" : "text-sm")}>{name}</span>
                </label>
              )
            })}
          </div>
          <p id="announcement-feature-hint" className="text-xs text-muted-foreground">
            {t.featureHint}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy !== null} onClick={() => void run("test")} className={cn(action, "border border-primary enabled:hover:bg-primary enabled:hover:text-primary-foreground")}>
            {busy === "test" ? t.sendingTest : t.sendTest}
          </button>
          <button
            type="button"
            disabled={busy !== null || nobody}
            onClick={() => setAsking(true)}
            className={cn(action, "bg-primary text-primary-foreground enabled:hover:bg-primary-hover")}
          >
            {busy === "send" ? t.sending : t.sendAll}
          </button>
          {started && busy === null && (
            <button type="button" onClick={startNew} className="min-h-11 px-2 text-label uppercase tracking-caps text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {t.startNew}
            </button>
          )}
        </div>
        {busy === "send" && (
          <p role="status" className="text-sm text-muted-foreground">
            {t.sendingNote}
          </p>
        )}
        {nobody && <p className="text-sm text-muted-foreground">{t.nobody}</p>}
      </section>

      <section aria-labelledby="history-title" className={panel}>
        <h2 id="history-title" className={panelTitle}>
          {t.history}
        </h2>
        {load.announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul aria-label={t.history} className="flex flex-col border-t border-border">
            {load.announcements.map((announcement) => {
              const open = reading === announcement.id
              const featured = nameOf(announcement.productId)
              return (
                <li key={announcement.id} className="border-b border-border">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`announcement-${announcement.id}`}
                    onClick={() => setReading(open ? null : announcement.id)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-3 text-start sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
                  >
                    <span className="text-sm text-muted-foreground sm:order-first">{formatDay(announcement.sentAt)}</span>
                    <span className="text-end text-sm sm:order-last">{interpolate(t.sentTo, { count: announcement.recipients })}</span>
                    <span className="col-span-2 flex min-w-0 flex-col sm:col-span-1">
                      <span className="truncate font-display text-xl leading-tight">{announcement.subject}</span>
                      {featured && <span className="text-xs text-muted-foreground">{interpolate(t.featured, { name: featured })}</span>}
                    </span>
                  </button>
                  <div id={`announcement-${announcement.id}`} hidden={!open} className="flex flex-col gap-3 pb-5 sm:ps-32">
                    {paragraphsOf(announcement.message).map((paragraph, i) => (
                      <p key={i} className="text-sm leading-relaxed whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={asking}
        title={load.subscribers === 1 ? t.confirmTitleOne : interpolate(t.confirmTitle, { count: load.subscribers })}
        text={t.confirmText}
        keep={t.keep}
        confirm={t.confirm}
        onKeep={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false)
          void run("send")
        }}
      />
    </div>
  )
}
