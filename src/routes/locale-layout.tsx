import { Outlet, useParams } from "react-router"
import { isLocale } from "@/i18n/locales"
import NotFound from "@/pages/NotFound"

export default function LocaleLayout() {
  const { lang } = useParams()
  // ":lang?" matches any first segment; anything that is not a locale is a missing page.
  if (lang !== undefined && !isLocale(lang)) return <NotFound />
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
