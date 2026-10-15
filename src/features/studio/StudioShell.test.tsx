import { screen, within } from "@testing-library/react"
import Landed from "@/test/Landed"
import { renderStudioAt } from "@/test/render-studio"
import { fakeAdminAuth } from "@/test/studio"
import { STUDIO_COPY } from "./copy"
import StudioShell from "./StudioShell"

const s = STUDIO_COPY.shell
const signedIn = () => fakeAdminAuth({ signedInAs: "omar@example.com" })
const routes = [{ path: "/studio/sign-in", Component: Landed }]

function renderShell(auth = signedIn()) {
  return renderStudioAt(
    <StudioShell>
      <p>page body</p>
    </StudioShell>,
    "/studio/products",
    { auth, routes },
  )
}


describe("the studio shell", () => {
  it("frames the page with the studio's navigation, the admin's email and a way to the shop", async () => {
    renderShell()
    expect(screen.getByRole("main")).toHaveTextContent("page body")
    const nav = screen.getAllByRole("navigation", { name: s.navLabel })[0]
    expect(within(nav).getByRole("link", { name: s.products })).toHaveAttribute("href", "/studio/products")
    expect(within(nav).getByRole("link", { name: s.products })).toHaveAttribute("aria-current", "page")
    expect(await screen.findAllByText("omar@example.com")).not.toHaveLength(0)
    for (const shop of screen.getAllByRole("link", { name: new RegExp(`^(${s.viewShop}|${s.shop})`) })) {
      expect(shop).toHaveAttribute("href", "/")
      expect(shop).toHaveAttribute("target", "_blank")
      expect(shop).toHaveAttribute("rel", "noopener noreferrer")
    }
  })

  it("offers a skip link to the page", () => {
    renderShell()
    expect(screen.getAllByRole("link", { name: "Skip to content" })[0]).toHaveAttribute("href", "#main")
  })

  it("signs out through the sign-out page, so an open form can ask first", () => {
    renderShell()
    for (const link of screen.getAllByRole("link", { name: s.signOut })) expect(link).toHaveAttribute("href", "/studio/sign-out")
  })
})
