// Unsaved form drafts survive a 401 (Rami, 2026-10-16): before the studio sends the admin to sign in, every open form
// with changes is kept in this tab's sessionStorage, by piece id or "new", and the same page restores it after
// sign-in. Only the form's own fields are kept, never a token or a password. Saving clears its draft; signing out
// clears them all.
import { EMPTY_FORM, type ProductFormValues } from "./product-form"

export type DraftKey = number | "new"

const PREFIX = "glowstone.studio.draft:"
const FIELDS = Object.keys(EMPTY_FORM) as (keyof ProductFormValues)[]

const storageKey = (key: DraftKey) => `${PREFIX}${key}`

function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function isForm(value: unknown): value is ProductFormValues {
  if (typeof value !== "object" || value === null) return false
  const row = value as Record<string, unknown>
  return FIELDS.every((field) => typeof row[field] === typeof EMPTY_FORM[field]) && (row.status === "draft" || row.status === "published")
}

export function saveDraft(key: DraftKey, values: ProductFormValues): void {
  const kept = Object.fromEntries(FIELDS.map((field) => [field, values[field]]))
  try {
    storage()?.setItem(storageKey(key), JSON.stringify(kept))
  } catch {
    // Storage full or refused: the draft can't be kept, and the sign-in still goes ahead.
  }
}

export function readDraft(key: DraftKey): ProductFormValues | null {
  try {
    const raw = storage()?.getItem(storageKey(key))
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (isForm(value)) return value
  } catch {
    // Not JSON: dropped below.
  }
  clearDraft(key)
  return null
}

export function clearDraft(key: DraftKey): void {
  try {
    storage()?.removeItem(storageKey(key))
  } catch {
    // Nothing to clear.
  }
}

export function clearAllDrafts(): void {
  try {
    const store = storage()
    if (!store) return
    const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter((key): key is string => key?.startsWith(PREFIX) ?? false)
    for (const key of keys) store.removeItem(key)
  } catch {
    // Nothing to clear.
  }
}

type OpenDraft = () => { key: DraftKey; values: ProductFormValues } | null

const open = new Set<OpenDraft>()

/** An open form reports its unsaved values (or null when there are none). Returns the unregister function. */
export function registerOpenDraft(read: OpenDraft): () => void {
  open.add(read)
  return () => {
    open.delete(read)
  }
}

/** Called when the session ends: keeps every open form's unsaved values. */
export function stashOpenDrafts(): void {
  for (const read of open) {
    const draft = read()
    if (draft) saveDraft(draft.key, draft.values)
  }
}
