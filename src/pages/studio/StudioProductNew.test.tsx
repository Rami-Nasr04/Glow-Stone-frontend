import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { STUDIO_COPY } from "@/features/studio/copy"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import { adminProductOf, bodiesOf, fakeAdminAuth, stubAdminApi } from "@/test/studio"
import StudioProductNew from "./StudioProductNew"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const f = STUDIO_COPY.form
const labels = f.fields
const field = (label: string) => screen.getByLabelText(new RegExp(`^${label.replace(/[()]/g, "\\$&")}`))

function renderNew() {
  const fetch = stubAdminApi([adminProductOf(1)])
  renderStudioAt(<StudioProductNew />, "/studio/products/new", {
    auth: fakeAdminAuth({ signedInAs: "omar@example.com" }),
    routes: [
      { path: "/studio/products", Component: Landed },
      { path: "/studio/products/:id", Component: Landed },
    ],
  })
  return fetch
}

async function fillRequired() {
  const user = userEvent.setup()
  await user.type(field(labels.name), "Studio check")
  await user.type(field(labels.stoneType), "Limestone")
  await user.type(field(labels.color), "Cream")
  await user.type(field(labels.price), "640")
  await user.type(field(labels.bottles), "6")
  await user.type(field(labels.editionSize), "8")
  await user.type(field(labels.remaining), "8")
  return user
}

beforeEach(() => sessionStorage.clear())

describe("the studio's new-product page", () => {
  it("starts empty, as a draft that isn't featured", () => {
    renderNew()
    expect(screen.getByRole("heading", { level: 1, name: f.newTitle })).toBeInTheDocument()
    expect(field(labels.name)).toHaveValue("")
    expect(screen.getByRole("radio", { name: f.draft })).toBeChecked()
    expect(screen.getByRole("switch", { name: f.featured })).toHaveAttribute("aria-checked", "false")
    expect(screen.getByRole("button", { name: f.create })).toBeEnabled()
    expect(within(screen.getByRole("region", { name: f.photos })).getByText(STUDIO_COPY.photos.saveFirst)).toBeInTheDocument()
  })

  it("names every missing required field and focuses the first", async () => {
    const fetch = renderNew()
    await userEvent.setup().click(screen.getByRole("button", { name: f.create }))
    for (const label of [labels.name, labels.stoneType, labels.color, labels.price, labels.bottles, labels.editionSize, labels.remaining]) {
      expect(field(label)).toHaveAccessibleDescription(f.errors.required)
    }
    expect(field(labels.name)).toHaveFocus()
    expect(bodiesOf(fetch, "POST")).toEqual([])
  })

  it("creates the piece with the full input and opens it", async () => {
    const fetch = renderNew()
    const user = await fillRequired()
    await user.type(field(labels.heightCm), "72.5")
    await user.type(field(labels.summary), "  A tall slab.  ")
    await user.click(screen.getByRole("button", { name: f.create }))
    expect(await landedOn("/studio/products/99")).toBeInTheDocument()
    expect(bodiesOf(fetch, "POST")).toEqual([
      {
        name: "Studio check",
        stoneType: "Limestone",
        color: "Cream",
        price: 640,
        bottles: 6,
        heightCm: 72.5,
        widthCm: null,
        depthCm: null,
        weightKg: null,
        editionSize: 8,
        remaining: 8,
        status: "draft",
        featured: false,
        summary: "A tall slab.",
        story: null,
      },
    ])
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(f.createdToast, { position: "top-center" }))
  })

  it("asks before leaving with something typed", async () => {
    renderNew()
    const user = userEvent.setup()
    await user.type(field(labels.name), "Half done")
    expect(screen.getByText(f.unsaved)).toBeInTheDocument()
    await user.click(screen.getByRole("link", { name: `← ${f.back}` }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: STUDIO_COPY.leave.leave }))
    expect(await landedOn("/studio/products")).toBeInTheDocument()
  })
})
