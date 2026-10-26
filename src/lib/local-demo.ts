// `npm run dev:demo` (Vite's mode "demo" on the dev server): the live API answers only glowstonelb.com and
// studio.glowstonelb.com (backend 9e28860), so local work runs on demo data and nothing local calls it. Callers write
// `import.meta.env.DEV && localDemo()`: DEV is a build-time false, so every build drops what it guards (check:pages
// fails a build that still carries the demo).
export const localDemo = (): boolean => import.meta.env.MODE === "demo"
