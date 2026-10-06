import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  route(":lang?", "routes/locale-layout.tsx", [
    index("routes/home.tsx"),
    route("collection", "routes/collection.tsx"),
    route("collection/:slug", "routes/product.tsx"),
    route("about", "routes/about.tsx"),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig
