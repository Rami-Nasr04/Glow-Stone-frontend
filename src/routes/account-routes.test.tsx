import { render, screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import AuthProvider from "@/features/auth/AuthProvider"
import { createMockAuth } from "@/features/auth/mock-auth"
import { MESSAGES } from "@/i18n/useLocale"
import * as forgotPassword from "./forgot-password"
import LocaleLayout from "./locale-layout"
import * as signIn from "./sign-in"
import * as signUp from "./sign-up"
import * as verify from "./verify"

// A built site before the customer pool is live: the account pages are closed.
vi.mock("@/features/auth/client", async (importOriginal) => ({ ...(await importOriginal<object>()), ACCOUNTS_OPEN: false }))

// The root puts every page inside the customer AuthProvider.
const inRoot = (tree: React.ReactElement) => <AuthProvider client={createMockAuth(null)}>{tree}</AuthProvider>

interface AccountRoute {
  default: React.ComponentType
  handle: unknown
  meta: (args: never) => { title?: string }[]
}

describe("account pages while accounts are closed", () => {
  it.each([
    ["/sign-in", signIn],
    ["/sign-up", signUp],
    ["/verify?email=a%40b.co", verify],
    ["/forgot-password", forgotPassword],
  ] as [string, AccountRoute][])("%s shows the missing page inside the site frame", (path, route) => {
    const Stub = createRoutesStub([
      { path: "/:lang?", Component: LocaleLayout, children: [{ path: path.split("?")[0].slice(1), Component: route.default, handle: route.handle }] },
    ])
    render(inRoot(<Stub initialEntries={[path]} />))
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(MESSAGES.en.notFound.title)
    expect(screen.getByRole("banner")).toBeInTheDocument()
    expect(document.querySelector("main input")).toBeNull()
    const tags = route.meta({ params: {} } as never)
    expect(tags).toContainEqual({ title: MESSAGES.en.notFound.metaTitle })
    expect(tags).toContainEqual({ name: "robots", content: "noindex" })
  })
})
