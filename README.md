# Glow Stone — Frontend

Web client for Glow Stone.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui · Motion · React Router · Sonner · Lucide

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run type-check` | TypeScript check only |
| `npm run lint` | Lint with oxlint |
| `npm test` | Run unit tests (Vitest) |

## Layout

```
src/
├── pages/        # Route-level components
├── components/
│   ├── ui/       # shadcn/ui primitives
│   └── <feature>/
├── services/     # API client and data access
├── contexts/     # App-wide state (theme, auth)
├── hooks/        # Custom hooks
├── lib/          # Pure utilities
└── config/       # App configuration
```
