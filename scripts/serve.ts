// Serves the built site the way Vercel serves it with vercel.json: the file, else the folder's index.html
// (with or without the trailing slash, no redirect), else the rewrite destination, always with status 200
// and the headers vercel.json sets. `vite preview` resolves folders only with a trailing slash, so it
// answered /collection with the home page.
// Usage: npm start (node scripts/serve.ts [port], port 4173 by default)
import { existsSync, readFileSync, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, resolve, sep } from "node:path"

interface Header {
  key: string
  value: string
}

export interface VercelConfig {
  outputDirectory: string
  rewrites: { source: string; destination: string }[]
  headers: { source: string; headers: Header[] }[]
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
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

// vercel.json sources here are plain regular expressions such as "/(.*)" and "/assets/(.*)".
const matches = (source: string, pathname: string) => new RegExp(`^${source}$`).test(pathname)

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

export function createSiteServer(outputDir: string, config: VercelConfig) {
  const root = resolve(outputDir)
  return createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname
    const decoded = decode(pathname)
    const rewrite = config.rewrites.find((r) => matches(r.source, pathname))
    const file = (decoded && fileFor(root, decoded)) || (rewrite && fileFor(root, rewrite.destination))
    if (!file) {
      res.writeHead(404, { "Content-Type": TYPES[".txt"] }).end("Not found")
      return
    }

    const headers: Record<string, string> = {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": DEFAULT_CACHE,
    }
    for (const rule of config.headers) {
      if (matches(rule.source, pathname)) for (const { key, value } of rule.headers) headers[key] = value
    }
    res.writeHead(200, headers).end(req.method === "HEAD" ? undefined : readFileSync(file))
  })
}

if (import.meta.main) {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig
  const port = Number(process.argv[2] ?? 4173)
  if (!existsSync(join(config.outputDirectory, "index.html"))) {
    console.error(`No build in ${config.outputDirectory}. Run npm run build first.`)
    process.exit(1)
  }
  createSiteServer(config.outputDirectory, config).listen(port, () => {
    console.log(`Serving ${config.outputDirectory} like Vercel at http://localhost:${port}`)
  })
}
