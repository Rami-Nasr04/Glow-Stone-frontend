import { Links, Meta, Outlet, Scripts, ScrollRestoration, useParams } from "react-router"
import Toaster from "@/components/ui/sonner"
import { directionOf, toLocale } from "@/i18n/locales"
import "./index.css"

export function Layout({ children }: { children: React.ReactNode }) {
  const locale = toLocale(useParams().lang)
  return (
    <html lang={locale} dir={directionOf(locale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Toaster position="top-right" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return <Outlet />
}
