import { render } from "@testing-library/react"
import { createRoutesStub } from "react-router"

// Renders a component inside the router, as if the browser were at `path` ("/ar/..." selects Arabic).
export function renderAt(element: React.ReactElement, path = "/") {
  const Stub = createRoutesStub([{ path: "/:lang?/*", Component: () => element }])
  return render(<Stub initialEntries={[path]} />)
}
