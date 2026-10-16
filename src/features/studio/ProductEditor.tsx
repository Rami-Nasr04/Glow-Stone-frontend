import { useEffect, useRef, useState } from "react"
import { Link, useBeforeUnload, useBlocker, useNavigate } from "react-router"
import { Field, inputClass } from "@/components/ui/field"
import { studioPath } from "@/config/studio"
import type { AdminProduct } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import { MESSAGES } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import StudioNotFound from "@/pages/studio/StudioNotFound"
import { type ProductField, StudioError } from "./admin-api"
import { useAdminAuth } from "./auth/admin-auth-context"
import { STUDIO_COPY } from "./copy"
import ConfirmDialog from "./ConfirmDialog"
import { clearDraft, type DraftKey, readDraft, registerOpenDraft } from "./drafts"
import { panel, panelTitle } from "./panel"
import PhotoManager from "./PhotoManager"
import { EMPTY_FORM, type FormErrors, formFromProduct, hasChanges, type ProductFormValues, readForm, changedFields } from "./product-form"
import StudioNote from "./StudioNote"
import { studioToast } from "./toast"

interface ProductEditorProps {
  /** The saved piece, or null for a new one. */
  piece: AdminProduct | null
}

type TextField = Exclude<keyof ProductFormValues, "status" | "featured">

const f = STUDIO_COPY.form

// Screen order, for focusing the first field with a problem.
const FIELD_ORDER: ProductField[] = [
  "name",
  "stoneType",
  "color",
  "summary",
  "story",
  "bottles",
  "heightCm",
  "widthCm",
  "depthCm",
  "weightKg",
  "price",
  "editionSize",
  "remaining",
]
const OPTIONAL: readonly ProductField[] = ["summary", "story", "heightCm", "widthCm", "depthCm", "weightKg"]

const idOf = (key: ProductField) => `product-${key}`

function focusField(errors: FormErrors) {
  const first = FIELD_ORDER.find((key) => errors[key])
  if (first) document.getElementById(idOf(first))?.focus()
}

// The edition line exactly as the shop words it, once the numbers can be read.
function previewLine(values: ProductFormValues): string | null {
  const edition = Number(values.editionSize)
  const remaining = Number(values.remaining)
  if (!values.editionSize.trim() || !values.remaining.trim() || !Number.isInteger(edition) || !Number.isInteger(remaining)) return null
  if (edition <= 0 || remaining < 0 || remaining > edition) return null
  const m = MESSAGES.en.edition
  return remaining === 0 ? m.soldOut : interpolate(m.remaining, { edition, remaining })
}

// Create and edit one piece: exactly the API's fields, checked like the database, sending only what changed.
// Unsaved changes ask before leaving, and survive a 401 (kept in sessionStorage, restored here after sign-in). Photos
// are changed apart from the form (PhotoManager): each change goes to the API at once.
export default function ProductEditor({ piece }: ProductEditorProps) {
  const { api } = useAdminAuth()
  const navigate = useNavigate()
  const key: DraftKey = piece?.id ?? "new"
  const [saved, setSaved] = useState(piece)
  const [restored] = useState(() => readDraft(key))
  const [values, setValues] = useState<ProductFormValues>(() => restored ?? (piece ? formFromProduct(piece) : EMPTY_FORM))
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [gone, setGone] = useState(false)
  const [uploading, setUploading] = useState(false)

  const dirty = hasChanges(values, saved)
  const latest = useRef({ dirty, uploading, values, leaving: false })
  useEffect(() => {
    latest.current = { ...latest.current, dirty, uploading, values }
  })

  // Read when the session ends: the open form's unsaved values are kept for after sign-in.
  useEffect(() => registerOpenDraft(() => (latest.current.dirty ? { key, values: latest.current.values } : null)), [key])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (latest.current.dirty || latest.current.uploading) && !latest.current.leaving && currentLocation.pathname !== nextLocation.pathname,
  )
  useBeforeUnload((event) => {
    if (latest.current.dirty || latest.current.uploading) event.preventDefault()
  })

  if (gone) return <StudioNotFound />

  const set = (field: keyof ProductFormValues, value: string | boolean) => setValues((current) => ({ ...current, [field]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const read = readForm(values)
    if ("errors" in read) {
      setErrors(read.errors)
      setFormError(f.fixErrors)
      focusField(read.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      if (saved) {
        const changes = changedFields(saved, read.input)
        if (Object.keys(changes).length > 0) {
          const result = await api.updateProduct(saved.id, changes)
          setSaved(result)
          setValues(formFromProduct(result))
          clearDraft(key)
          studioToast.success(f.savedToast)
        }
        setSaving(false)
      } else {
        const result = await api.createProduct(read.input)
        clearDraft(key)
        latest.current.leaving = true
        studioToast.success(f.createdToast)
        navigate(studioPath(`/products/${result.id}`), { replace: true })
      }
    } catch (error) {
      setSaving(false)
      if (!(error instanceof StudioError)) {
        studioToast.error(f.saveFailed)
        return
      }
      // A 401 has already kept this draft and sent the admin to sign in.
      if (error.status === 401) return
      if (error.code === "NOT_FOUND") setGone(true)
      else if (error.field) {
        const found = { [error.field]: error.message }
        setErrors(found)
        focusField(found)
      } else if (error.code === "VALIDATION") setFormError(error.message)
      else studioToast.error(f.saveFailed)
    }
  }

  const textField = (field: TextField, { wide = false, numeric }: { wide?: boolean; numeric?: "decimal" | "numeric" } = {}) => (
    <Field
      id={idOf(field)}
      label={f.fields[field]}
      error={errors[field]}
      announce={Boolean(errors[field]) && !formError}
      className={cn(wide && "sm:col-span-2")}
      hint={OPTIONAL.includes(field) ? <span className="text-xs text-muted-foreground">{f.optional}</span> : undefined}
    >
      {(control) => (
        <input
          type="text"
          inputMode={numeric}
          autoComplete="off"
          value={values[field]}
          onChange={(e) => set(field, e.target.value)}
          className={cn(inputClass, field === "name" && "font-display text-2xl")}
          {...control}
        />
      )}
    </Field>
  )

  const preview = previewLine(values)
  const statusLine = saving ? f.saving : dirty ? f.unsaved : f.noChanges

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5 pb-24">
      <Link to={studioPath("/products")} className="flex min-h-11 items-center gap-2.5 self-start text-label uppercase tracking-caps">
        ← {f.back}
      </Link>
      <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{saved?.name ?? f.newTitle}</h1>
      {restored && (
        <p role="status" className="border-y border-accent py-3 text-sm">
          {f.restored}
        </p>
      )}
      <StudioNote>{STUDIO_COPY.website}</StudioNote>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(17.5rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <PhotoManager productId={saved?.id ?? null} initial={saved?.images ?? []} onUploadingChange={setUploading} />

          <section aria-labelledby="details-title" className={panel}>
            <h2 id="details-title" className={panelTitle}>
              {f.details}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {textField("name", { wide: true })}
              {textField("stoneType")}
              {textField("color")}
              {textField("summary", { wide: true })}
              <Field
                id={idOf("story")}
                label={f.fields.story}
                error={errors.story}
                className="sm:col-span-2"
                hint={<span className="text-xs text-muted-foreground">{f.optional}</span>}
              >
                {(control) => (
                  <textarea
                    rows={7}
                    value={values.story}
                    onChange={(e) => set("story", e.target.value)}
                    className="w-full resize-y border border-border bg-background/40 p-3 text-base leading-relaxed transition-colors duration-500 focus:border-accent focus:shadow-[0_0_0_1px_var(--accent)] focus:outline-none"
                    {...control}
                  />
                )}
              </Field>
            </div>
          </section>

          <section aria-labelledby="specs-title" className={panel}>
            <h2 id="specs-title" className={panelTitle}>
              {f.specs}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12.5rem),1fr))] gap-x-5 gap-y-6">
              {textField("bottles", { numeric: "numeric" })}
              {textField("heightCm", { numeric: "decimal" })}
              {textField("widthCm", { numeric: "decimal" })}
              {textField("depthCm", { numeric: "decimal" })}
              {textField("weightKg", { numeric: "decimal" })}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <section aria-labelledby="status-title" className={panel}>
            <h2 id="status-title" className={panelTitle}>
              {f.statusTitle}
            </h2>
            <fieldset className="grid grid-cols-2 border border-primary">
              <legend className="sr-only">{f.statusTitle}</legend>
              {(["draft", "published"] as const).map((status) => (
                <label
                  key={status}
                  className="flex min-h-11 cursor-pointer items-center justify-center text-label uppercase tracking-[0.14em] transition-colors duration-500 has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline has-focus-visible:outline-accent"
                >
                  <input type="radio" name="status" value={status} checked={values.status === status} onChange={() => set("status", status)} className="sr-only" />
                  {status === "draft" ? f.draft : f.published}
                </label>
              ))}
            </fieldset>
            <p className="text-xs text-muted-foreground">{f.statusHint}</p>
            <button
              type="button"
              role="switch"
              aria-checked={values.featured}
              onClick={() => set("featured", !values.featured)}
              className="flex min-h-11 items-center justify-between gap-3 text-sm"
            >
              <span>{f.featured}</span>
              <span aria-hidden="true" className={cn("relative h-5.5 w-10 rounded-full border border-primary transition-colors duration-500", values.featured && "bg-primary")}>
                <span
                  className={cn(
                    "absolute top-0.75 size-3.5 rounded-full transition-[inset-inline-start,background-color] duration-500",
                    values.featured ? "start-5 bg-primary-foreground" : "start-0.75 bg-primary",
                  )}
                />
              </span>
            </button>
          </section>

          <section aria-labelledby="edition-title" className={panel}>
            <h2 id="edition-title" className={panelTitle}>
              {f.edition}
            </h2>
            {textField("price", { numeric: "decimal" })}
            <div className="grid grid-cols-2 gap-4">
              {textField("editionSize", { numeric: "numeric" })}
              {textField("remaining", { numeric: "numeric" })}
            </div>
            {preview && <p className="text-xs text-muted-foreground">{interpolate(f.preview, { line: preview })}</p>}
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-dark-section px-4 py-3 lg:start-62 lg:px-10">
        <span aria-live="polite" className="flex items-center gap-2 text-sm text-dark-muted-foreground">
          <span aria-hidden="true" className={cn("size-1.5 rotate-45 bg-wine-on-dark", !dirty && "opacity-0")} />
          {statusLine}
        </span>
        <button
          type="submit"
          disabled={saving || (saved !== null && !dirty)}
          className="min-h-11 bg-dark-section-foreground px-6 text-label uppercase tracking-caps text-dark-section transition-opacity duration-500 focus-visible:outline-on-photo disabled:opacity-60"
        >
          {saving ? f.saving : saved ? (dirty ? f.save : f.noChanges) : f.create}
        </button>
      </div>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title={uploading ? STUDIO_COPY.leave.uploadingTitle : STUDIO_COPY.leave.title}
        text={uploading ? STUDIO_COPY.leave.uploadingText : STUDIO_COPY.leave.text}
        keep={STUDIO_COPY.leave.stay}
        confirm={STUDIO_COPY.leave.leave}
        onKeep={() => blocker.reset?.()}
        onConfirm={() => {
          clearDraft(key)
          latest.current.leaving = true
          blocker.proceed?.()
        }}
      />
    </form>
  )
}
