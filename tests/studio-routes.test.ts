import type { RouteConfigEntry } from "@react-router/dev/routes"
import { describe, expect, it } from "vitest"
import { prerenderPaths } from "../src/i18n/paths.ts"
import routes from "../src/routes.ts"
import { studioRoutes } from "../src/studio-routes.ts"

// Every full address a route config answers, e.g. "/studio/products/:id".
function addresses(entries: RouteConfigEntry[], parent = ""): string[] {
  return entries.flatMap((entry) => {
    const path = entry.path === undefined ? parent : `${parent.replace(/\/$/, "")}/${entry.path.replace(/^\//, "")}`
    const own = entry.index ? [parent || "/"] : entry.path !== undefined && !entry.children?.length ? [path] : []
    return [...own, ...addresses(entry.children ?? [], path)]
  })
}

const STUDIO_PAGES = ["/sign-in", "/sign-in/new-password", "/forgot-password", "/sign-out", "/products", "/products/new", "/products/:id"]

describe("the studio's routes", () => {
  it("sit under /studio today", () => {
    const found = addresses(studioRoutes("/studio"))
    expect(found).toEqual(expect.arrayContaining(["/studio", "/studio/*", ...STUDIO_PAGES.map((page) => `/studio${page}`)]))
    expect(found.every((path) => path.startsWith("/studio"))).toBe(true)
  })

  it("all move with the base, for the subdomain later", () => {
    const found = addresses(studioRoutes("/"))
    expect(found).toEqual(expect.arrayContaining(["/", "/*", ...STUDIO_PAGES]))
    expect(found.some((path) => path.includes("studio"))).toBe(false)
  })

  it("are mounted in the site's routes, ahead of the shop", () => {
    expect(addresses(routes)).toEqual(expect.arrayContaining(STUDIO_PAGES.map((page) => `/studio${page}`)))
    expect(routes.findIndex((entry) => entry.path === "/studio")).toBeLessThan(routes.findIndex((entry) => entry.path === ":lang?"))
  })

  it("are never prerendered: the built studio is the SPA shell", () => {
    expect(prerenderPaths([{ id: 5, name: "Qadisha" }]).some((path) => path.includes("studio"))).toBe(false)
  })
})
