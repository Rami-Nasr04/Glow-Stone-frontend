import { index, layout, route, type RouteConfigEntry } from "@react-router/dev/routes"
import { STUDIO_BASE } from "./config/studio.ts"

// The studio's pages under one parent route at the base, so moving the studio to its own subdomain changes only the
// base. The sign-in pages are open; everything in the shell needs a signed-in admin.
export function studioRoutes(base: string = STUDIO_BASE): RouteConfigEntry[] {
  return [
    route(base, "routes/studio/layout.tsx", [
      index("routes/studio/index.tsx"),
      route("sign-in", "routes/studio/sign-in.tsx"),
      route("sign-in/new-password", "routes/studio/new-password.tsx"),
      route("forgot-password", "routes/studio/forgot-password.tsx"),
      route("sign-out", "routes/studio/sign-out.tsx"),
      layout("routes/studio/shell.tsx", [
        route("orders", "routes/studio/orders.tsx"),
        route("products", "routes/studio/products.tsx"),
        route("products/new", "routes/studio/product-new.tsx"),
        route("products/:id", "routes/studio/product-edit.tsx"),
      ]),
      route("*", "routes/studio/not-found.tsx"),
    ]),
  ]
}

