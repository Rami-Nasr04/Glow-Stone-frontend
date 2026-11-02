# Glow Stone — Frontend

Web store for Glowstone: hand-carved Lebanese limestone wine racks in small numbered editions.

## Stack

React 19 · React Router 8 (framework mode, prerendered) · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui · Motion · Sonner · Lucide

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values
npm run dev:demo
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev:demo` | Start the dev server on demo data (`react-router dev --mode demo`): the live API answers only glowstonelb.com and studio.glowstonelb.com, so local work never calls it. Customers, orders and the studio's pieces live in this browser; the studio signs in with the real admin pool |
| `npm run build` | Prerender every public page to static HTML in `build/client` |
| `npm run start` | Serve the production build locally |
| `npm run type-check` | Generate route types and type-check |
| `npm run lint` | Lint with oxlint |
| `npm test` | Run unit tests (Vitest) |
| `node scripts/build-images.ts "<originals folder>"` | Generate the responsive WebP images in `public/images` |

`vite` is pinned to 8.3.1 with `rolldown` overridden to 1.2.11; check `npm ls rolldown` after upgrading dependencies.

## Hosting

Two Vercel projects build this repo from `build/client` (`vercel.json`): the shop at https://glowstonelb.com (`VITE_SITE_PARTS=shop`) and the studio at https://studio.glowstonelb.com (`VITE_SITE_PARTS=studio`, `VITE_STUDIO_BASE=/`). Pages that are not prerendered (sign-in, checkout, the account, every studio page) are served by the app shell `/__spa-fallback.html`; any other address answers 404 with `404.html`. On the shop, the studio's old addresses (`/studio/...`) answer 308 to the same page on the studio's host. Product photos come from the API's CloudFront addresses.

## Layout

```
src/
├── root.tsx      # <html lang dir>, fonts, toaster
├── routes.ts     # route table (optional language prefix)
├── routes/       # thin route modules (meta, page component)
├── pages/        # full pages
├── components/
│   ├── ui/       # shadcn/ui primitives
│   ├── layout/   # header, footer
│   └── media/    # responsive images
├── i18n/         # locales, paths, dictionaries, formatting
├── config/       # site configuration (contact channels)
└── lib/          # pure utilities
```
