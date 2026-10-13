import { useEffect, useState } from "react"
import { listProducts } from "./catalog"
import type { ProductSummary } from "./types"

export type LiveStock = ReadonlyMap<number, Pick<ProductSummary, "remaining" | "soldOut">>

// Pages are built with the catalog written in; only the stock is re-read once the page shows, so a piece bought since
// the last build reads as sold out. Prices, names and photos change with the next build.
export function useLiveStock(): LiveStock | null {
  const [live, setLive] = useState<LiveStock | null>(null)
  useEffect(() => {
    const abort = new AbortController()
    // A failed refresh keeps the built values on purpose: the server checks the stock again at checkout.
    listProducts(abort.signal)
      .then((pieces) => setLive(new Map(pieces.map(({ id, remaining, soldOut }) => [id, { remaining, soldOut }]))))
      .catch(() => {})
    return () => abort.abort()
  }, [])
  return live
}

export function withLiveStock<T extends ProductSummary>(piece: T, live: LiveStock | null): T {
  const stock = live?.get(piece.id)
  return stock ? { ...piece, ...stock } : piece
}
