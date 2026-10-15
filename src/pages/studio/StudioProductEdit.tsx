import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router"
import type { AdminProduct } from "@/features/catalog/types"
import { StudioError } from "@/features/studio/admin-api"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { STUDIO_COPY } from "@/features/studio/copy"
import ProductEditor from "@/features/studio/ProductEditor"
import StudioNotFound from "./StudioNotFound"

type Load = { state: "loading" } | { state: "missing" } | { state: "failed" } | { state: "ready"; piece: AdminProduct }

const f = STUDIO_COPY.form

export default function StudioProductEdit() {
  const { api } = useAdminAuth()
  const raw = useParams().id ?? ""
  const id = /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null
  const [load, setLoad] = useState<Load>({ state: "loading" })

  // A 401 has already ended the session; an unknown piece is "not found"; anything else can be tried again.
  const fetchPiece = useCallback(
    (pieceId: number) =>
      api.getProduct(pieceId).then(
        (piece): Load => ({ state: "ready", piece }),
        (error: unknown): Load => (error instanceof StudioError && error.code === "NOT_FOUND" ? { state: "missing" } : { state: "failed" }),
      ),
    [api],
  )

  useEffect(() => {
    if (id === null) return
    let live = true
    void fetchPiece(id).then((next) => live && setLoad(next))
    return () => {
      live = false
    }
  }, [fetchPiece, id])

  if (id === null || load.state === "missing") return <StudioNotFound />
  if (load.state === "loading") {
    return (
      <p role="status" className="py-6 text-sm text-muted-foreground">
        {f.loading}
      </p>
    )
  }
  if (load.state === "failed") {
    const retry = () => {
      setLoad({ state: "loading" })
      void fetchPiece(id).then(setLoad)
    }
    return (
      <div className="flex flex-wrap items-center gap-4 border border-border bg-studio-panel px-5 py-4">
        <p role="alert" className="text-sm text-destructive">
          {f.loadFailed}
        </p>
        <button type="button" onClick={retry} className="min-h-11 text-label uppercase tracking-caps underline underline-offset-4">
          {f.retry}
        </button>
      </div>
    )
  }
  return <ProductEditor key={load.piece.id} piece={load.piece} />
}
