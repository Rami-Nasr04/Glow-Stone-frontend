import { screen } from "@testing-library/react"
import { readDraft, saveDraft } from "@/features/studio/drafts"
import { EMPTY_FORM } from "@/features/studio/product-form"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import { fakeAdminAuth } from "@/test/studio"
import StudioSignOut from "./StudioSignOut"

describe("the studio's sign-out page", () => {
  it("signs out, clears every kept draft, and opens the sign-in page", async () => {
    const auth = fakeAdminAuth({ signedInAs: "omar@example.com" })
    saveDraft(5, { ...EMPTY_FORM, name: "Kept" })
    renderStudioAt(<StudioSignOut />, "/studio/sign-out", { auth, routes: [{ path: "/studio/sign-in", Component: Landed }] })
    expect(screen.getByRole("status")).toHaveTextContent("Signing out…")
    expect(await landedOn("/studio/sign-in")).toBeInTheDocument()
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(readDraft(5)).toBeNull()
  })
})
