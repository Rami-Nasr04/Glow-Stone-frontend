import { render } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import AuthProvider from "@/features/auth/AuthProvider"
import type { AuthClient } from "@/features/auth/types"

interface RenderOptions {
  /** Wraps the page in an AuthProvider with this client (use a fresh createMockAuth(null) per test). */
  auth?: AuthClient
  /** Extra routes, e.g. a probe at "/sign-in" to assert a redirect. */
  routes?: { path: string; Component: React.ComponentType }[]
}

// Renders a component inside the router, as if the browser were at `path` ("/ar/..." selects Arabic).
export function renderAt(element: React.ReactElement, path = "/", { auth, routes = [] }: RenderOptions = {}) {
  const Stub = createRoutesStub([...routes, { path: "/:lang?/*", Component: () => element }])
  const tree = <Stub initialEntries={[path]} />
  return render(auth ? <AuthProvider client={auth}>{tree}</AuthProvider> : tree)
}
