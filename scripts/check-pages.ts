/// <reference lib="dom" />
// (DOM types: the callbacks passed to the page run inside the browser.)
// Opens every built page in a real browser by its address without the trailing slash, then checks
// that the page shown is that page (its h1 and title, read from its own built HTML), after a direct
// load and after a refresh, at 1440 and 390. Also checks that an unknown address shows the 404,
// that the app moves on to another page after landing, and that the header logo link can be clicked.
// Usage: npm run build, npm start, then npm run check:pages (local), or
//        npm run check:pages -- https://glow-stone-frontend.vercel.app
// The browser is Microsoft Edge; set EDGE_PATH if it is installed elsewhere.
import { readdirSync, readFileSync } from "node:fs"
import { join, sep } from "node:path"
import puppeteer, { type Page } from "puppeteer-core"
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

const pages = builtPages(BUILD)
const home = pages.find((p) => p.path === "/")
if (!home) throw new Error(`No home page in ${BUILD}. Run npm run build first.`)
// Only the h1: under an unknown first segment the 404 keeps the home title (accepted until the studio exists).
const notFound: Expected = { path: "/nothing-here", h1: en.notFound.title }

const browser = await puppeteer.launch({ executablePath: edge, headless: true })
const viewports = [
  { name: "1440", width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
]

console.log(`Checking ${pages.length} pages on ${base}`)
for (const viewport of viewports) {
  for (const want of [...pages, notFound]) {
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
      await checkLogo(page, home, label)
    } else if (viewport.name === "390") {
      // Over the mobile hero the small logo waits until the visitor scrolls, but shows when tabbed onto.
      const visible = await logoOnFocus(page)
      if (!visible) fail(`${label}: the header logo stays invisible while it has keyboard focus`)
      await page.evaluate(() => window.scrollTo(0, 400))
      await new Promise((done) => setTimeout(done, 900))
      await checkLogo(page, home, `${label} scrolled`)
    }

    for (const error of errors) fail(`${label}: script error "${error}"`)
    console.log(`  ok ${label}`)
    await page.close()
  }
}
await browser.close()

console.log(failures.length === 0 ? "All pages passed." : `${failures.length} problem(s).`)
process.exitCode = failures.length === 0 ? 0 : 1
