// Serves the built site the way Vercel serves it with vercel.json: a redirect first (308 when permanent, the query
// string kept), else the file, else the folder's index.html (with or without the trailing slash, no redirect), else
// the rewrite destination (status 200), else 404.html with status 404; always with the headers vercel.json sets. A rule
// with a host condition (`has`) applies only to a request for that host, and one with `missing` never does (the Host
// header, without its port). `vite preview` resolves folders only with a trailing slash, so it answered /collection
// with the home page.
// Usage: npm start (node scripts/serve.ts [port] [host], port 4173 by default). With a host, every request is served
// as if it came for that host, e.g. npm start -- 4173 studio.glowstonelb.com for a studio-only build.
import { existsSync, readFileSync, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, resolve, sep } from "node:path"

interface Header {
  key: string
  value: string
}

/** Vercel's `has` condition; only the host kind is used. */
interface Condition {
  type: "host"
  value: string
}

export interface VercelConfig {
  outputDirectory: string
  redirects: { source: string; destination: string; permanent: boolean; missing?: Condition[] }[]
  rewrites: { source: string; destination: string; has?: Condition[] }[]
  headers: { source: string; has?: Condition[]; headers: Header[] }[]
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
}

// What Vercel sends when no rule in vercel.json sets Cache-Control.
const DEFAULT_CACHE = "public, max-age=0, must-revalidate"

// vercel.json sources here are plain paths with unnamed groups, such as "/(.*)" and "/checkout/thanks/([0-9]+)", which
// read the same as a regular expression and through Vercel's path-to-regexp (tests/hosting.test.ts keeps them so).
const matches = (rule: { source: string; has?: Condition[] }, pathname: string, host: string) =>
  new RegExp(`^${rule.source}$`).test(pathname) && (rule.has ?? []).every((condition) => condition.value === host)

// A redirect source is a plain path that may end in one named wildcard, "/studio/:path*": path-to-regexp reads it as
// that path alone or followed by any segments, and the destination's ":path*" takes them (tests/hosting.test.ts).
const WILDCARD = /\/:([a-z]+)\*$/

/** Where Vercel sends an address before looking for a file, if anywhere. */
export function redirectFor(config: VercelConfig, pathname: string, host: string) {
  for (const rule of config.redirects) {
    if ((rule.missing ?? []).some((condition) => condition.value === host)) continue
    const name = WILDCARD.exec(rule.source)?.[1]
    const found = new RegExp(`^${rule.source.replace(WILDCARD, "(?:/(.*))?")}$`).exec(pathname)
    if (!found) continue
    const location = name ? rule.destination.replace(`:${name}*`, found[1] ?? "") : rule.destination
    return { status: rule.permanent ? 308 : 307, location }
  }
  return undefined
}

/** The rewrite Vercel applies to an address with no file of its own, if any. */
export function rewriteFor(config: VercelConfig, pathname: string, host: string) {
  return config.rewrites.find((rule) => matches(rule, pathname, host))
}

function fileFor(root: string, pathname: string): string | undefined {
  const target = resolve(root, `.${pathname}`)
  if (target !== root && !target.startsWith(root + sep)) return undefined
  return [target, join(target, "index.html")].find((path) => existsSync(path) && statSync(path).isFile())
}

function decode(pathname: string): string | undefined {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return undefined
  }
}

export function createSiteServer(outputDir: string, config: VercelConfig, asHost?: string) {
  const root = resolve(outputDir)
  return createServer((req, res) => {
    const { pathname, search } = new URL(req.url ?? "/", "http://localhost")
    const host = asHost ?? (req.headers.host ?? "").replace(/:\d+$/, "")
    const redirect = redirectFor(config, pathname, host)
    const decoded = decode(pathname)
    const rewrite = rewriteFor(config, pathname, host)
    const found = (decoded && fileFor(root, decoded)) || (rewrite && fileFor(root, rewrite.destination))
    const file = found || fileFor(root, "/404.html")
    const headers: Record<string, string> = {
      "Content-Type": file ? (TYPES[extname(file)] ?? "application/octet-stream") : TYPES[".txt"],
      "Cache-Control": DEFAULT_CACHE,
    }
    for (const rule of config.headers) {
      if (matches(rule, pathname, host)) for (const { key, value } of rule.headers) headers[key] = value
    }
    if (redirect) {
      res.writeHead(redirect.status, { ...headers, Location: redirect.location + search, "Content-Type": TYPES[".txt"] }).end()
      return
    }
    const body = file ? readFileSync(file) : "Not found"
    res.writeHead(found ? 200 : 404, headers).end(req.method === "HEAD" ? undefined : body)
  })
}

// A build to serve: its home page, or (a studio-only build, nothing prerendered) the rewrite's app shell.
export function hasBuild(outputDir: string, config: VercelConfig): boolean {
  return [join(outputDir, "index.html"), ...config.rewrites.map((r) => join(outputDir, r.destination))].some((path) => existsSync(path))
}

if (import.meta.main) {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig
  const port = Number(process.argv[2] ?? 4173)
  const asHost = process.argv[3]
  if (!hasBuild(config.outputDirectory, config)) {
    console.error(`No build in ${config.outputDirectory}. Run npm run build first.`)
    process.exit(1)
  }
  createSiteServer(config.outputDirectory, config, asHost).listen(port, () => {
    console.log(`Serving ${config.outputDirectory} like Vercel at http://localhost:${port}${asHost ? ` as ${asHost}` : ""}`)
  })
}
