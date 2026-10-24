import { index, route, type RouteConfig, type RouteConfigEntry } from "@react-router/dev/routes"
import { type SitePart, SITE_PARTS, STUDIO_BASE } from "./config/studio.ts"
import { studioRoutes } from "./studio-routes.ts"

// The shop: every public page under an optional language segment.
function shopRoutes(): RouteConfigEntry[] {
  return [
    route(":lang?", "routes/locale-layout.tsx", [
      index("routes/home.tsx"),
      route("collection", "routes/collection.tsx"),
      route("collection/:id/:name?", "routes/product.tsx"),
      route("about", "routes/about.tsx"),
      route("contact", "routes/contact.tsx"),
      route("legal/:doc", "routes/legal.tsx"),
      route("sign-in", "routes/sign-in.tsx"),
      route("sign-up", "routes/sign-up.tsx"),
      route("verify", "routes/verify.tsx"),
      route("forgot-password", "routes/forgot-password.tsx"),
      route("checkout", "routes/checkout.tsx"),
      route("checkout/thanks/:id", "routes/order-placed.tsx"),
      route("account", "routes/account.tsx"),
      route("account/orders/:id", "routes/account-order.tsx"),
      route("*", "routes/not-found.tsx"),
    ]),
  ]
}

// The routes of a build that carries these parts; a part left out has no route, so none of its code is bundled.
// Static segments outrank ":lang?", so the studio's base never reaches the shop.
export function siteRoutes(parts: readonly SitePart[], base: string): RouteConfigEntry[] {
  return [...(parts.includes("studio") ? studioRoutes(base) : []), ...(parts.includes("shop") ? shopRoutes() : [])]
}

export default siteRoutes(SITE_PARTS, STUDIO_BASE) satisfies RouteConfig
