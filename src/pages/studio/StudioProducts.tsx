import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router"
import { studioPath } from "@/config/studio"
import type { AdminProduct } from "@/features/catalog/types"
import NoPhoto from "@/features/catalog/NoPhoto"
import { stoneLabel } from "@/features/catalog/format"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { STUDIO_COPY } from "@/features/studio/copy"
import StatusBadge from "@/features/studio/StatusBadge"
import StudioNote from "@/features/studio/StudioNote"
import { studioToast } from "@/features/studio/toast"
import { formatPrice, interpolate } from "@/i18n/format"
import { photoUrl } from "@/lib/images"
import { cn } from "@/lib/utils"

const t = STUDIO_COPY.list

// Desktop columns as in the prototype, without the lead time (not in the contract): cover, name, stone, price,
// stock, status, star. Phones: cover, name with price · stock, status, star.
const columns = "grid grid-cols-[2.5rem_minmax(0,1fr)_auto_2.75rem] items-center gap-3.5 lg:grid-cols-[3rem_1.4fr_1.2fr_0.7fr_0.7fr_0.9fr_2.75rem]"

type Load = { state: "loading" } | { state: "failed" } | { state: "ready"; pieces: AdminProduct[] }

function stockLabel(piece: Pick<AdminProduct, "remaining" | "editionSize">): string {
  return piece.remaining === 0 ? t.soldOut : interpolate(t.remaining, { remaining: piece.remaining, edition: piece.editionSize })
}

export default function StudioProducts() {
  const { api } = useAdminAuth()
  const [load, setLoad] = useState<Load>({ state: "loading" })

  // A 401 has already ended the session; anything else can be tried again.
  const fetchList = useCallback(
    () =>
      api.listProducts().then(
        (pieces): Load => ({ state: "ready", pieces }),
        (): Load => ({ state: "failed" }),
      ),
    [api],
  )

  useEffect(() => {
    let live = true
    void fetchList().then((next) => live && setLoad(next))
    return () => {
      live = false
    }
  }, [fetchList])

  const retry = () => {
    setLoad({ state: "loading" })
    void fetchList().then(setLoad)
  }

  const setFeatured = (id: number, featured: boolean) =>
    setLoad((current) => (current.state === "ready" ? { ...current, pieces: current.pieces.map((p) => (p.id === id ? { ...p, featured } : p)) } : current))

  // Only { featured } is sent; the star moves at once and goes back if the change isn't saved.
  const toggleFeatured = async (piece: AdminProduct) => {
    const featured = !piece.featured
    setFeatured(piece.id, featured)
    try {
      await api.updateProduct(piece.id, { featured })
      studioToast.success(interpolate(featured ? t.featuredSaved : t.unfeaturedSaved, { name: piece.name }), { description: STUDIO_COPY.form.savedToast })
    } catch {
      setFeatured(piece.id, piece.featured)
      studioToast.error(t.featureFailed)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{t.title}</h1>
        <Link
          to={studioPath("/products/new")}
          className="flex min-h-11 items-center bg-primary px-5 text-label uppercase tracking-caps text-primary-foreground transition-colors duration-500 hover:bg-primary-hover"
        >
          + {t.newProduct}
        </Link>
      </div>
      <StudioNote>{STUDIO_COPY.website}</StudioNote>

      {load.state === "loading" && (
        <p role="status" className="py-6 text-sm text-muted-foreground">
          {t.loading}
        </p>
      )}
      {load.state === "failed" && (
        <div className="flex flex-wrap items-center gap-4 border border-border bg-studio-panel px-5 py-4">
          <p role="alert" className="text-sm text-destructive">
            {t.loadFailed}
          </p>
          <button type="button" onClick={retry} className="min-h-11 text-label uppercase tracking-caps underline underline-offset-4">
            {t.retry}
          </button>
        </div>
      )}
      {load.state === "ready" && (
        <section aria-label={t.title} className="border border-border bg-studio-panel">
          <div aria-hidden="true" className={cn(columns, "hidden border-b border-border px-5 py-3 text-label uppercase tracking-caps text-muted-foreground lg:grid")}>
            <span />
            <span>{t.columns.name}</span>
            <span>{t.columns.stone}</span>
            <span>{t.columns.price}</span>
            <span>{t.columns.stock}</span>
            <span>{t.columns.status}</span>
            <span className="text-center">★</span>
          </div>
          {load.pieces.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <ul>
              {load.pieces.map((piece) => {
                const edit = studioPath(`/products/${piece.id}`)
                const cover = piece.images[0]
                const low = piece.remaining <= 3
                return (
                  <li key={piece.id} className={cn(columns, "border-b border-border px-5 py-2.5 last:border-b-0")}>
                    <Link to={edit} tabIndex={-1} aria-hidden="true" className="block h-15 w-10 overflow-hidden bg-muted">
                      {cover ? (
                        <img
                          src={photoUrl(cover, 480)}
                          alt=""
                          width={cover.width}
                          height={cover.height}
                          loading="lazy"
                          className={cn("size-full object-contain", piece.soldOut && "grayscale-70")}
                        />
                      ) : (
                        <NoPhoto />
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link to={edit} className="font-display text-xl leading-tight hover:text-accent">
                        {piece.name}
                      </Link>
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {formatPrice(piece.price)} · {stockLabel(piece)}
                      </span>
                    </div>
                    <span className="hidden text-muted-foreground lg:block">{stoneLabel(piece)}</span>
                    <span className="hidden lg:block">{formatPrice(piece.price)}</span>
                    <span className={cn("hidden font-medium lg:block", low && "text-accent")}>{stockLabel(piece)}</span>
                    <StatusBadge status={piece.status} />
                    <button
                      type="button"
                      aria-pressed={piece.featured}
                      aria-label={interpolate(piece.featured ? t.unfeature : t.feature, { name: piece.name })}
                      onClick={() => void toggleFeatured(piece)}
                      className={cn("size-11 text-lg transition-colors duration-500", piece.featured ? "text-accent" : "text-muted-foreground hover:text-foreground")}
                    >
                      <span aria-hidden="true">{piece.featured ? "★" : "☆"}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
