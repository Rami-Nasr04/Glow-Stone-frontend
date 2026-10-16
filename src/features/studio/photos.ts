// Adding photos to a piece (the backend's admin photos contract): ask for a slot, post the file straight to storage,
// then confirm it, and the server makes the master. Several files go one at a time, in the order chosen; one failure
// doesn't stop the others.
import type { AdminProductImage } from "@/features/catalog/types"
import { type ApiImage, IMAGE_WIDTHS, photoUrl } from "@/lib/images"
import { type AdminApi, StudioError, type UploadSlot } from "./admin-api"

export const MAX_PHOTO_BYTES = 30 * 1024 * 1024
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
/** The file input's accept list: iPhones then send HEIC photos as JPEG. */
export const PHOTO_ACCEPT = PHOTO_TYPES.join(",")

export const PHOTO_MESSAGES = {
  // The contract's own words, so a photo refused here reads the same as one the server refuses.
  tooLarge: "This photo is larger than 30 MB.",
  wrongType: "This file isn't a JPEG, PNG or WebP photo.",
  storage: "The photo couldn't be uploaded. Check the connection and try again.",
} as const

/** The reason this file can't be sent, or null when it can. */
export function checkPhoto(file: File): string | null {
  if (file.size > MAX_PHOTO_BYTES) return PHOTO_MESSAGES.tooLarge
  if (!PHOTO_TYPES.some((type) => type === file.type)) return PHOTO_MESSAGES.wrongType
  return null
}

// Storage takes a plain form POST: the slot's fields first, then Content-Type, then the file last. No Authorization
// header: the slot's signed policy is the permission.
export async function sendToStorage(slot: UploadSlot, file: File): Promise<void> {
  const form = new FormData()
  for (const [name, value] of Object.entries(slot.fields)) form.append(name, value)
  form.append("Content-Type", file.type)
  form.append("file", file)
  let response: Response
  try {
    response = await fetch(slot.url, { method: "POST", body: form })
  } catch {
    throw new StudioError(0, "STORAGE", PHOTO_MESSAGES.storage)
  }
  if (!response.ok) throw new StudioError(response.status, "STORAGE", PHOTO_MESSAGES.storage)
}

/** Loads every size once, so the CDN has them cached before the first visitor. */
export function prewarm(photo: ApiImage): void {
  for (const width of IMAGE_WIDTHS) new Image().src = photoUrl(photo, width)
}

/** One photo: checked here first, then the three calls. `onConfirm` runs once the file is in storage. */
export async function addPhoto(api: AdminApi, productId: number, file: File, onConfirm?: () => void): Promise<AdminProductImage> {
  const refused = checkPhoto(file)
  if (refused) throw new StudioError(0, "VALIDATION", refused)
  const slot = await api.requestUpload(productId)
  await sendToStorage(slot, file)
  onConfirm?.()
  const photo = await api.confirmUpload(productId, slot.uploadId)
  prewarm(photo)
  return photo
}

export interface AddPhotosHooks {
  /** Before each photo: its number (from 1) and how many there are. */
  onProgress: (current: number, total: number) => void
  onAdded: (photo: AdminProductImage) => void
  /** The piece's photos after a reload. */
  onReloaded: (photos: AdminProductImage[]) => void
  /** Before each photo, the names not added so far (failed + still to go); [] when the batch ends without a 401. */
  onPending: (names: string[]) => void
  /** The ids of the photos the screen shows now. */
  knownIds: () => number[]
  /** The piece's photos as the server has them. */
  reload: () => Promise<AdminProductImage[]>
  /** True once the admin has left the page. */
  isCancelled: () => boolean
}

export interface AddPhotosResult {
  added: AdminProductImage[]
  failed: { name: string; message: string }[]
  /** Not sent: the session ended, or the admin left. */
  notTried: string[]
  unauthorized: boolean
}

export async function addPhotos(api: AdminApi, productId: number, files: readonly File[], hooks: AddPhotosHooks): Promise<AddPhotosResult> {
  const result: AddPhotosResult = { added: [], failed: [], notTried: [], unauthorized: false }
  const names = files.map((file) => file.name)
  for (const [i, file] of files.entries()) {
    if (hooks.isCancelled()) {
      result.notTried = names.slice(i)
      break
    }
    hooks.onPending([...result.failed.map((failed) => failed.name), ...names.slice(i)])
    hooks.onProgress(i + 1, files.length)
    const known = hooks.knownIds()
    let confirming = false
    try {
      const photo = await addPhoto(api, productId, file, () => (confirming = true))
      result.added.push(photo)
      hooks.onAdded(photo)
    } catch (error) {
      const failure = error instanceof StudioError ? error : new StudioError(0, "UNEXPECTED", PHOTO_MESSAGES.storage)
      if (failure.status === 401) {
        result.unauthorized = true
        result.notTried = names.slice(i)
        return result
      }
      // The 30-photo limit answers every later photo the same way: they're listed with it, without more calls.
      if (failure.code === "CONFLICT") {
        result.failed.push(...names.slice(i).map((name) => ({ name, message: failure.message })))
        break
      }
      // A failed confirm may still have worked (a repeated confirm, a timeout): the piece is reloaded, and a photo
      // the screen didn't know is the one just sent.
      if (confirming && (await landedAnyway(hooks, known, result))) continue
      result.failed.push({ name: file.name, message: failure.message })
    }
  }
  hooks.onPending([])
  return result
}

async function landedAnyway(hooks: AddPhotosHooks, known: number[], result: AddPhotosResult): Promise<boolean> {
  let photos: AdminProductImage[]
  try {
    photos = await hooks.reload()
  } catch {
    return false
  }
  hooks.onReloaded(photos)
  const fresh = photos.filter((photo) => !known.includes(photo.id))
  if (fresh.length === 0) return false
  result.added.push(...fresh)
  return true
}
