import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// The base is written in config/studio.ts only; every other studio address goes through studioPath() or is relative.
describe("the studio base", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? files(path) : [path]
    })

  it('appears nowhere else in the source as "/studio"', () => {
    const offenders = files("src")
      .map((path) => path.replaceAll("\\", "/"))
      .filter((path) => /\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.startsWith("src/test/") && path !== "src/config/studio.ts")
      // An address, not a file name like "./config/studio.ts" or "./studio-routes.ts".
      .filter((path) => /(?<![\w.-])\/studio(?![\w.-])/.test(readFileSync(path, "utf8")))
    expect(offenders).toEqual([])
  })
})
