import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import { fakeAdminAuth } from "@/test/studio"
import { STUDIO_COPY } from "./copy"
import { readDraft, registerOpenDraft, saveDraft } from "./drafts"
import { EMPTY_FORM } from "./product-form"
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

beforeEach(() => sessionStorage.clear())

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

  it("signs out and goes to the sign-in page", async () => {
    const auth = signedIn()
    renderShell(auth)
    saveDraft("new", { ...EMPTY_FORM, name: "Old draft" })
    await userEvent.setup().click(screen.getAllByRole("button", { name: s.signOut })[0])
    expect(await landedOn("/studio/sign-in")).toBeInTheDocument()
    expect(auth.signOut).toHaveBeenCalled()
    expect(readDraft("new")).toBeNull()
  })

  it("asks before signing out with unsaved changes", async () => {
    const auth = signedIn()
    renderShell(auth)
    const unregister = registerOpenDraft(() => ({ key: 5, values: { ...EMPTY_FORM, name: "Unsaved" } }))
    const user = userEvent.setup()
    await user.click(screen.getAllByRole("button", { name: s.signOut })[0])
    const dialog = await screen.findByRole("alertdialog", { name: STUDIO_COPY.leave.title })
    await user.click(within(dialog).getByRole("button", { name: STUDIO_COPY.leave.stay }))
    expect(auth.signOut).not.toHaveBeenCalled()
    await user.click(screen.getAllByRole("button", { name: s.signOut })[0])
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: STUDIO_COPY.leave.leave }))
    expect(await landedOn("/studio/sign-in")).toBeInTheDocument()
    expect(auth.signOut).toHaveBeenCalled()
    unregister()
  })
})
