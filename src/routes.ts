import { type RouteConfig, index, route } from "@react-router/dev/routes"
import { studioRoutes } from "./studio-routes.ts"

export default [
  // Static segments outrank ":lang?", so the studio's base never reaches the shop.
  ...studioRoutes(),
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
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig
