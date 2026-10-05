# Glow Stone — Frontend

Web store for Glowstone: hand-carved Lebanese limestone wine racks in small numbered editions.

## Stack

React 19 · React Router 8 (framework mode, prerendered) · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui · Motion · Sonner · Lucide

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (`react-router dev`) |
| `npm run build` | Prerender every public page to static HTML in `build/client` |
| `npm run start` | Serve the production build locally |
| `npm run type-check` | Generate route types and type-check |
| `npm run lint` | Lint with oxlint |
| `npm test` | Run unit tests (Vitest) |
| `node scripts/build-images.ts "<originals folder>"` | Generate the responsive WebP images in `public/images` |

`vite` is pinned to 8.3.1 with `rolldown` overridden to 1.2.11; check `npm ls rolldown` after upgrading dependencies.

## Hosting

Deployed on Vercel from `build/client` (`vercel.json`). Pages that are not prerendered (account, checkout, admin) are served by the app shell `/__spa-fallback.html`. Product photos move to S3 + CloudFront with the admin; set `VITE_IMAGE_BASE_URL` then.

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
