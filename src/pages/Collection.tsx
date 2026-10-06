import { useSearchParams } from "react-router"
import CollectionGrid from "@/components/collection/CollectionGrid"
import CollectionIntro from "@/components/collection/CollectionIntro"
import FilterBar from "@/components/collection/FilterBar"
import { filterPieces, NO_FILTERS, readFilters, writeFilters, type Filters } from "@/components/collection/filters"
import FilterSheet from "@/components/collection/FilterSheet"
import { listProducts } from "@/features/catalog/catalog"
import { useLocale } from "@/i18n/useLocale"

export default function Collection() {
  const { locale } = useLocale()
  const [params, setParams] = useSearchParams()
  const all = listProducts(locale)
  const filters = readFilters(params)
  const pieces = filterPieces(all, filters)
  const setFilters = (next: Filters) => setParams(writeFilters(next), { replace: true, preventScrollReset: true })

  return (
    // overflow-x-clip: the interlude's charcoal band runs to the viewport edges.
    <section className="overflow-x-clip px-gutter pt-section pb-[clamp(4.5rem,7vw,6.5rem)]">
      <div className="mx-auto max-w-content">
        <CollectionIntro count={all.length} />
        <div className="mt-[clamp(3.5rem,7vw,6rem)] mb-[clamp(3rem,6vw,5rem)]">
          <FilterBar filters={filters} count={pieces.length} onChange={setFilters} className="hidden md:flex" />
          <FilterSheet filters={filters} count={pieces.length} onChange={setFilters} className="md:hidden" />
        </div>
        <CollectionGrid pieces={pieces} onClear={() => setFilters(NO_FILTERS)} />
      </div>
    </section>
  )
}
