import { render, screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import AdminAuthProvider from "@/features/studio/auth/AdminAuthProvider"
import type { AdminAuthClient } from "@/features/studio/auth/types"
import { fakeAdminAuth } from "./studio"

interface StudioRenderOptions {
  auth?: AdminAuthClient
  /** The route pattern the element answers, e.g. "/studio/products/:id". Defaults to the path itself. */
  pattern?: string
  /** Extra routes, e.g. { path: "/studio/products", Component: Landed }. */
  routes?: { path: string; Component: React.ComponentType }[]
  /** The history state the page was opened with (a link's state). */
  state?: unknown
}

// Renders a studio page inside the router and the studio's own session, as if the browser were at `path`.
export function renderStudioAt(element: React.ReactElement, path: string, { auth = fakeAdminAuth(), pattern, routes = [], state }: StudioRenderOptions = {}) {
  const Stub = createRoutesStub([...routes, { path: pattern ?? path.split("?")[0], Component: () => element }])
  const result = render(
    <AdminAuthProvider client={auth} apiBase="https://api.test">
      <Stub initialEntries={[state === undefined ? path : { pathname: path.split("?")[0], search: path.includes("?") ? `?${path.split("?")[1]}` : "", state }]} />
    </AdminAuthProvider>,
  )
  return { ...result, auth }
}

/** Waits for a redirect probe. */
export async function landedOn(path: string) {
  return screen.findByText(`landed: ${path}`)
}
