/// <reference lib="dom" />
// (DOM types: the callbacks passed to the page run inside the browser.)
// Opens every built page in a real browser by its address without the trailing slash, then checks
// that the page shown is that page (its h1 and title, read from its own built HTML), after a direct
// load and after a refresh, at 1440 and 390. Also checks that an unknown address answers 404 and shows the 404 page,
// that a page that isn't prerendered (sign-in) still answers 200, that the app
// moves on to another page after landing, and that the header logo link can be clicked. Every built page's canonical
// and og:url must be the address checked (so after VITE_SITE_URL changes, one run against the new address proves it),
// and its robots tag and X-Robots-Tag header must agree.
// The studio: its addresses load and refresh to its sign-in page (or its not-found), never indexed, and no shop
// page loads the Cognito library for a signed-out visitor. On the shop's address, the studio's old addresses answer
// 308 to its own host.
// A build of one part (VITE_SITE_PARTS, set the same way for the build and this check): "shop" has no studio route
// and no studio code; "studio" (VITE_STUDIO_BASE=/) has the studio at the root, the shop's addresses on the studio's
// not-found, nothing prerendered, noindex in the shell's own HTML, and no shop sign-in or cart code.
// Usage: npm run build, npm start, then npm run check:pages (local), or against a deployment of the same build:
//        npm run check:pages -- https://glowstonelb.com
// A studio-only build locally: npm start -- 4173 studio.glowstonelb.com (the server then applies that host's rules).
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
  /** The status of a direct load: 200 unless said otherwise. */
  status?: number
  /** A prerendered page: its canonical and og:url are checked. */
  built?: boolean
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
        built: true,
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

// The chunk that carries the Cognito library: studio pages load it, shop pages only once a customer has signed in
// on this browser (never for the signed-out visitor this check is).
const withShop = SITE_PARTS.includes("shop")
const withStudio = SITE_PARTS.includes("studio")
const assets = readdirSync(join(BUILD, "assets")).map((file) => ({ file, text: readFileSync(join(BUILD, "assets", file), "utf8") }))
const cognitoChunks = assets.filter(({ text }) => text.includes("USER_SRP_AUTH")).map(({ file }) => file)
if (cognitoChunks.length === 0) throw new Error("No chunk carries the Cognito library; the check would prove nothing.")
const carrying = (words: string[]) => assets.filter(({ text }) => words.some((word) => text.includes(word))).map(({ file }) => file)
// A shop-only build carries no studio code: not its sign-in, not its words, not its admin variables.
if (!withStudio) {
  const studioCode = carrying([STUDIO_COPY.signIn.intro, STUDIO_COPY.photos.hint, "VITE_ADMIN_", "challenge_expired"])
  if (studioCode.length > 0) fail(`the shop-only build carries studio code: ${studioCode.join(", ")}`)
}
// A studio-only build carries no shop code: not the customer sign-in (real or demo), not the cart.
if (!withShop) {
  const shopCode = carrying(["PreSignUp failed with error", "glowstone.demo-auth", "glowstone.cart", "VITE_CUSTOMER_"])
  if (shopCode.length > 0) fail(`the studio-only build carries shop code: ${shopCode.join(", ")}`)
}

async function loadedCognito(page: Page): Promise<string[]> {
  const loaded = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name))
  return loaded.filter((url) => cognitoChunks.some((file) => url.endsWith(`/${file}`)))
}

// Signed out, every studio address ends on the sign-in page, which asks to come back afterwards.
const signIn = studioPath("/sign-in")
const studioPages = [
  { open: studioPath("/"), path: signIn, next: safeStudioNext(studioPath("/products")), h1: STUDIO_COPY.signIn.title },
  { open: signIn, path: signIn, next: null, h1: STUDIO_COPY.signIn.title },
  { open: studioPath("/products/5"), path: signIn, next: studioPath("/products/5"), h1: STUDIO_COPY.signIn.title },
  { open: studioPath("/nothing-here"), path: studioPath("/nothing-here"), next: null, h1: STUDIO_COPY.notFound.title },
  // Without the shop, its addresses are the studio's not-found.
  ...["/collection", "/collection/5/qadisha", "/about"].map((path) => ({ open: path, path, next: null, h1: STUDIO_COPY.notFound.title })),
]
// The studio is served only on its own host (its project, VITE_SITE_PARTS=studio, VITE_STUDIO_BASE=/), so its pages
// are checked only in a studio-only build. On any other host, vercel.json sends the old /studio addresses there (old
// bookmarks), whatever the build carries; so a build of both parts (VITE_SITE_PARTS unset, used by no project) has
// its studio pages checked nowhere.
const STUDIO_ORIGIN = "https://studio.glowstonelb.com"
const studioRedirects = [
  ["/studio", `${STUDIO_ORIGIN}/`],
  ["/studio/products/4", `${STUDIO_ORIGIN}/products/4`],
]

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
// Unknown addresses: a real 404 with the 404 page. Only the h1: under an unknown first segment the 404 keeps the home
// page's title (accepted).
const notFound: Expected[] = ["/nothing-here", "/collection/abc", "/collection/99999/no-such-piece", "/legal/unknown", "/ar/collection"].map((path) => ({ path, h1: en.notFound.title, status: 404 }))
// Pages that aren't prerendered still answer 200 (a rewrite to the shell).
const notBuilt: Expected[] = [
  // Customer accounts are closed on built sites (ACCOUNTS_OPEN) until VITE_ACCOUNTS_OPEN=true: the 404 page, in the
  // site frame. When they open, it is full screen: h1 en.auth.signIn.title and no header logo to follow.
  { path: "/sign-in", h1: en.notFound.title },
  // Checkout and the account wait for the same flag.
  { path: "/checkout", h1: en.notFound.title },
  { path: "/account", h1: en.notFound.title },
]
const canonicalOf = (path: string) => `${base}${path}`

const browser = await puppeteer.launch({ executablePath: edge, headless: true })
const viewports = [
  { name: "1440", width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
]

console.log(`Checking ${pages.length} pages on ${base} (parts: ${SITE_PARTS.join(" + ")})`)
for (const viewport of viewports) {
  for (const want of withShop ? [...pages, ...notFound, ...notBuilt] : []) {
    const label = `${viewport.name} ${want.path}`
    const page = await browser.newPage()
    await page.setViewport(viewport)
    // Statuses and headers from fresh answers (a 304 from the cache carries neither the status nor X-Robots-Tag).
    await page.setCacheEnabled(false)
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error instanceof Error ? error.message : String(error)))

    const response = await page.goto(base + want.path, { waitUntil: "networkidle0" })
    const status = response?.status()
    if (status !== (want.status ?? 200)) fail(`${label}: status ${status}, expected ${want.status ?? 200}`)
    await expectPage(page, want, `${label} direct`)
    const head = await page.evaluate(() => ({
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
      ogUrl: document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content ?? null,
      robots: [...document.querySelectorAll<HTMLMetaElement>('meta[name="robots"]')].map((tag) => tag.content),
    }))
    if (want.built) {
      if (head.canonical !== canonicalOf(want.path)) fail(`${label}: canonical ${head.canonical}, expected ${canonicalOf(want.path)}`)
      if (head.ogUrl !== canonicalOf(want.path)) fail(`${label}: og:url ${head.ogUrl}, expected ${canonicalOf(want.path)}`)
    }
    const header = response?.headers()["x-robots-tag"]
    if (head.robots.includes("noindex, nofollow") !== (header === "noindex, nofollow")) {
      fail(`${label}: robots tag ${JSON.stringify(head.robots)} and X-Robots-Tag "${header}" disagree`)
    }
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

    const cognito = await loadedCognito(page)
    if (cognito.length > 0) fail(`${label}: loaded the Cognito library for a signed-out visitor (${cognito.join(", ")})`)
    for (const error of errors) fail(`${label}: script error "${error}"`)
    console.log(`  ok ${label}`)
    await page.close()
  }

  for (const want of withShop ? [] : studioPages) {
    const label = `${viewport.name} ${want.open}`
    const page = await browser.newPage()
    await page.setViewport(viewport)
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error instanceof Error ? error.message : String(error)))
    // Every studio address is the same shell: from the cache, Vercel answers 304 without the X-Robots-Tag header
    // (the browser keeps the cached one), so the header is read from a fresh answer.
    await page.setCacheEnabled(false)
    const response = await page.goto(base + want.open, { waitUntil: "networkidle0" })
    if (response?.status() !== 200) fail(`${label}: status ${response?.status()}, expected 200`)
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

// The redirect itself, not followed (following it would leave for the live studio).
for (const [path, location] of withShop ? studioRedirects : []) {
  const response = await fetch(base + path, { redirect: "manual" })
  const got = `${response.status} ${response.headers.get("location")}`
  if (got !== `308 ${location}`) fail(`${path}: answered ${got}, expected 308 ${location}`)
  else console.log(`  ok ${path} -> 308 ${location}`)
}

console.log(failures.length === 0 ? "All pages passed." : `${failures.length} problem(s).`)
process.exitCode = failures.length === 0 ? 0 : 1
