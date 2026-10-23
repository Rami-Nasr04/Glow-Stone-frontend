import { Links, Meta, Outlet, Scripts, ScrollRestoration, useParams } from "react-router"
import RobotsMeta from "@/components/layout/RobotsMeta"
import Toaster from "@/components/ui/sonner"
import { directionOf } from "@/i18n/locales"
import { pageLocale } from "@/i18n/paths"
import "./index.css"
import cormorantLight from "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-normal.woff2?url"
import jost from "@fontsource-variable/jost/files/jost-latin-wght-normal.woff2?url"
import type { Route } from "./+types/root"

// The browser finds the fonts only after the stylesheet has arrived. These two set the text of every page above the
// fold, so they're asked for with it (the same files the stylesheet names; the other weights and italics wait).
export const links: Route.LinksFunction = () =>
  [jost, cormorantLight].map((href) => ({ rel: "preload", href, as: "font", type: "font/woff2", crossOrigin: "anonymous" }))

export function Layout({ children }: { children: React.ReactNode }) {
  const locale = pageLocale(useParams().lang)
  return (
    <html lang={locale} dir={directionOf(locale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <RobotsMeta />
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
