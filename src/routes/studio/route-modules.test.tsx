import { screen } from "@testing-library/react"
import type { MetaDescriptor } from "react-router"
import { STUDIO_COPY } from "@/features/studio/copy"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import * as forgotPassword from "./forgot-password"
import StudioIndex from "./index"
import * as layout from "./layout"
import * as newPassword from "./new-password"
import * as notFound from "./not-found"
import * as productEdit from "./product-edit"
import * as productNew from "./product-new"
import * as products from "./products"
import * as signIn from "./sign-in"
import * as signOut from "./sign-out"

type MetaModule = { meta: (args: never) => MetaDescriptor[] }
const modules: Record<string, MetaModule> = { layout, signIn, signOut, newPassword, forgotPassword, products, productNew, productEdit, notFound }

describe("the studio's route modules", () => {
  // A child route's meta replaces its parent's, so every page carries the tag itself.
  it.each(Object.entries(modules))("%s is never indexed, whatever VITE_ALLOW_INDEXING says", (_name, module) => {
    const meta = module.meta({} as never)
    expect(meta).toContainEqual({ name: "robots", content: "noindex, nofollow" })
    expect(meta.find((tag) => "title" in tag)).toEqual({ title: expect.stringContaining(STUDIO_COPY.metaTitle) })
  })

  it("opens the products list at the studio's own address", async () => {
    renderStudioAt(<StudioIndex />, "/studio", { routes: [{ path: "/studio/products", Component: Landed }] })
    expect(await landedOn("/studio/products")).toBeInTheDocument()
  })

  it("answers an unknown studio address with the studio's not-found", () => {
    const NotFound = notFound.default
    renderStudioAt(<NotFound />, "/studio/nothing-here", { pattern: "/studio/*" })
    expect(screen.getByRole("heading", { level: 1, name: STUDIO_COPY.notFound.title })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: STUDIO_COPY.notFound.back })).toHaveAttribute("href", "/studio/products")
  })
})
