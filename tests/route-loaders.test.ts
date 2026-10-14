import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// React Router leaves `loader` out of the browser bundle (ssr:false), so a clientLoader that calls it throws
// "loader is not defined" on the built site, though it works in the tests that import the route.
describe("route client loaders", () => {
  it.each(["home", "collection", "about", "product"])("%s: the clientLoader never calls loader()", (route) => {
    const source = readFileSync(`src/routes/${route}.tsx`, "utf8")
    const body = source.slice(source.indexOf("export async function clientLoader"))
    expect(body.slice(0, body.indexOf("\n}\n"))).not.toMatch(/\bloader\(/)
  })
})
