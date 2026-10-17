/// <reference lib="dom" />
// (DOM types: the callbacks passed to the page run inside the browser.)
// Opens every built page in a real browser by its address without the trailing slash, then checks
// that the page shown is that page (its h1 and title, read from its own built HTML), after a direct
// load and after a refresh, at 1440 and 390. Also checks that an unknown address shows the 404,
// that the app moves on to another page after landing, and that the header logo link can be clicked.
// The studio: its addresses load and refresh to its sign-in page (or its not-found), never indexed, and no shop
// page loads the studio's sign-in code.
// A build of one part (VITE_SITE_PARTS, set the same way for the build and this check): "shop" has no studio route
// and no studio code; "studio" (VITE_STUDIO_BASE=/) has the studio at the root, the shop's addresses on the studio's
// not-found, nothing prerendered, and noindex in the shell's own HTML.
// Usage: npm run build, npm start, then npm run check:pages (local), or
//        npm run check:pages -- https://glow-stone-frontend.vercel.app
// The browser is Microsoft Edge; set EDGE_PATH if it is installed elsewhere.
import { readdirSync, readFileSync } from "node:fs"
import { join, sep } from "node:path"
import puppeteer, { type Page } from "puppeteer-core"
import { safeStudioNext, SITE_PARTS, studioPath } from "../src/config/studio.ts"
import { STUDIO_COPY } from "../src/features/studio/copy.ts"
import { en } from "../src/i18n/messages/en.ts"

const BUILD = "build/client"
const base = (process.argv[2] ?? "http://localhost:4173").replace(/\/+$/, "")
const edge = process.env.EDGE_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

interface Expected {
  path: string
  h1: string
  title?: string
}

const squash = (text: string) => text.replace(/\s+/g, " ").trim()

// The h1's text as a reader gets it: its words, or the image's alt text (the home h1 is the wordmark).
function h1Text(html: string): string {
  const inner = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? ""
  const text = inner
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/g, " $1 ")
    .replace(/<[^>]+>/g, "")
  return squash(text.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'))
}

function builtPages(dir: string): Expected[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file === "index.html" || file.endsWith(`${sep}index.html`))
    .map((file) => {
      const html = readFileSync(join(dir, file), "utf8")
      const folder = file.split(sep).slice(0, -1).join("/")
      return {
        path: `/${folder}`,
        h1: h1Text(html),
        title: squash(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "").replace(/&amp;/g, "&"),
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
}

const failures: string[] = []
const fail = (message: string) => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}

// The h1 inside main as the browser shows it once the app has reached the address (a click on a
// link changes the address only after the next page's data has loaded).
async function shown(page: Page, path: string) {
  await page
    .waitForFunction((want) => location.pathname === want && document.querySelector("main h1") !== null, { timeout: 15_000 }, path)
    .catch(() => null)
  await new Promise((done) => setTimeout(done, 400))
  return page.evaluate(() => {
    const h1 = document.querySelector("main h1")
    const alts = h1 ? [...h1.querySelectorAll("img")].map((img) => img.alt).join(" ") : ""
    return {
      h1: ((h1?.textContent ?? "") + " " + alts).replace(/\s+/g, " ").trim(),
      title: document.title,
      path: location.pathname,
    }
  })
}

async function expectPage(page: Page, want: Expected, label: string) {
  const got = await shown(page, want.path)
  if (got.path !== want.path) fail(`${label}: ended on ${got.path}`)
  if (got.h1 !== want.h1) fail(`${label}: h1 "${got.h1}", expected "${want.h1}"`)
  if (want.title !== undefined && got.title !== want.title) fail(`${label}: title "${got.title}", expected "${want.title}"`)
}

// The logo link must be on top at its own centre (not hidden or covered) and take the visitor home.
async function checkLogo(page: Page, home: Expected, label: string) {
  const logo = `header a[aria-label="${en.nav.home}"]`
  if (!(await page.$(logo))) return fail(`${label}: no header logo link`)
  const onTop = await page.$eval(logo, (link) => {
    const box = link.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return box.width > 0 && box.height > 0 && getComputedStyle(link).opacity !== "0" && link.contains(hit)
  })
  if (!onTop) return fail(`${label}: the header logo link is hidden or covered`)
  await page.click(logo)
  await expectPage(page, home, `${label} → logo`)
}

// Tabs from the top of the page to the header logo and reports whether it is visible there.
async function logoOnFocus(page: Page): Promise<boolean> {
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab")
    const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))
    if (label !== en.nav.home) continue
    await new Promise((done) => setTimeout(done, 900))
    return page.evaluate(() => document.activeElement !== null && getComputedStyle(document.activeElement).opacity === "1")
  }
  return false
}

// The chunk that carries the Cognito library: only studio pages may load it.
const withShop = SITE_PARTS.includes("shop")
const withStudio = SITE_PARTS.includes("studio")
const studioOnly = readdirSync(join(BUILD, "assets")).filter((file) => readFileSync(join(BUILD, "assets", file), "utf8").includes("USER_SRP_AUTH"))
if (withStudio && studioOnly.length === 0) throw new Error("No chunk carries the studio's sign-in code; the check would prove nothing.")
// A shop-only build carries no studio code at all: not its sign-in, not its words.
if (!withStudio) {
  const studioWords = readdirSync(join(BUILD, "assets")).filter((file) => {
    const text = readFileSync(join(BUILD, "assets", file), "utf8")
    return text.includes("USER_SRP_AUTH") || text.includes(STUDIO_COPY.signIn.intro) || text.includes(STUDIO_COPY.photos.hint)
  })
  if (studioWords.length > 0) fail(`the shop-only build carries studio code: ${studioWords.join(", ")}`)
}

async function loadedStudioCode(page: Page): Promise<string[]> {
  const loaded = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name))
  return loaded.filter((url) => studioOnly.some((file) => url.endsWith(`/${file}`)))
}

// Signed out, every studio address ends on the sign-in page, which asks to come back afterwards.
const signIn = studioPath("/sign-in")
const studioPages = [
  { open: studioPath("/"), path: signIn, next: safeStudioNext(studioPath("/products")), h1: STUDIO_COPY.signIn.title },
  { open: signIn, path: signIn, next: null, h1: STUDIO_COPY.signIn.title },
  { open: studioPath("/products/5"), path: signIn, next: studioPath("/products/5"), h1: STUDIO_COPY.signIn.title },
  { open: studioPath("/nothing-here"), path: studioPath("/nothing-here"), next: null, h1: STUDIO_COPY.notFound.title },
  // Without the shop, its addresses are the studio's not-found.
  ...(withShop ? [] : ["/collection", "/collection/5/qadisha", "/about"].map((path) => ({ open: path, path, next: null, h1: STUDIO_COPY.notFound.title }))),
]
// Without the studio, its old addresses are the shop's 404.
const noStudio: Expected[] = withStudio ? [] : ["/studio", "/studio/products", "/studio/sign-in"].map((path) => ({ path, h1: en.notFound.title }))

const pages = builtPages(BUILD)
const home = pages.find((p) => p.path === "/")
if (withShop && !home) throw new Error(`No home page in ${BUILD}. Run npm run build first.`)
// Only the shop's pages use it, and they exist only with the shop (checked above).
const homePage: Expected = home ?? { path: "/", h1: "" }
// The studio alone: nothing prerendered, and the shell itself (served for every address) says noindex.
if (!withShop) {
  if (pages.length > 0) fail(`the studio-only build prerendered ${pages.map((p) => p.path).join(", ")}`)
  const shell = readFileSync(join(BUILD, "__spa-fallback.html"), "utf8")
  if (!/<meta name="robots" content="noindex, nofollow"/.test(shell)) fail("the studio-only shell has no robots noindex tag")
}
// Only the h1: under an unknown first segment the 404 keeps the home title (accepted until the studio exists).
const notFound: Expected = { path: "/nothing-here", h1: en.notFound.title }

const browser = await puppeteer.launch({ executablePath: edge, headless: true })
const viewports = [
  { name: "1440", width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
]

console.log(`Checking ${pages.length} pages on ${base} (parts: ${SITE_PARTS.join(" + ")})`)
for (const viewport of viewports) {
  for (const want of withShop ? [...pages, notFound, ...noStudio] : []) {
    const label = `${viewport.name} ${want.path}`
    const page = await browser.newPage()
    await page.setViewport(viewport)
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error instanceof Error ? error.message : String(error)))

    await page.goto(base + want.path, { waitUntil: "networkidle0" })
    await expectPage(page, want, `${label} direct`)
    await page.reload({ waitUntil: "networkidle0" })
    await expectPage(page, want, `${label} refresh`)

    // A page that loaded as the wrong page stays stuck; a healthy one moves on.
    if (want.path !== "/") {
      await checkLogo(page, homePage, label)
    } else if (viewport.name === "390") {
      // Over the mobile hero the small logo waits until the visitor scrolls, but shows when tabbed onto.
      const visible = await logoOnFocus(page)
      if (!visible) fail(`${label}: the header logo stays invisible while it has keyboard focus`)
      await page.evaluate(() => window.scrollTo(0, 400))
      await new Promise((done) => setTimeout(done, 900))
      await checkLogo(page, homePage, `${label} scrolled`)
    }

    const studioCode = await loadedStudioCode(page)
    if (studioCode.length > 0) fail(`${label}: loaded the studio's code (${studioCode.join(", ")})`)
    for (const error of errors) fail(`${label}: script error "${error}"`)
    console.log(`  ok ${label}`)
    await page.close()
  }

  for (const want of withStudio ? studioPages : []) {
    const label = `${viewport.name} ${want.open}`
    const page = await browser.newPage()
    await page.setViewport(viewport)
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error instanceof Error ? error.message : String(error)))
    // Every studio address is the same shell: from the cache, Vercel answers 304 without the X-Robots-Tag header
    // (the browser keeps the cached one), so the header is read from a fresh answer.
    await page.setCacheEnabled(false)
    const response = await page.goto(base + want.open, { waitUntil: "networkidle0" })
    if (response?.headers()["x-robots-tag"] !== "noindex, nofollow") fail(`${label}: no X-Robots-Tag noindex header`)
    for (const step of ["direct", "refresh"]) {
      if (step === "refresh") await page.reload({ waitUntil: "networkidle0" })
      const got = await shown(page, want.path)
      const next = await page.evaluate(() => new URLSearchParams(location.search).get("next"))
      const robots = await page.$$eval('meta[name="robots"]', (tags) => tags.map((tag) => tag.getAttribute("content")))
      if (got.path !== want.path) fail(`${label} ${step}: ended on ${got.path}`)
      if (got.h1 !== want.h1) fail(`${label} ${step}: h1 "${got.h1}", expected "${want.h1}"`)
      if (next !== want.next) fail(`${label} ${step}: next ${next}, expected ${want.next}`)
      if (!robots.includes("noindex, nofollow")) fail(`${label} ${step}: no robots noindex tag`)
    }
    for (const error of errors) fail(`${label}: script error "${error}"`)
    console.log(`  ok ${label}`)
    await page.close()
  }
}
await browser.close()

console.log(failures.length === 0 ? "All pages passed." : `${failures.length} problem(s).`)
process.exitCode = failures.length === 0 ? 0 : 1
