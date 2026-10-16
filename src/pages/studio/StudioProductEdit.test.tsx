import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { STUDIO_COPY } from "@/features/studio/copy"
import StudioShell from "@/features/studio/StudioShell"
import { readDraft } from "@/features/studio/drafts"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import { adminProductOf, bodiesOf, failure, fakeAdminAuth, stubAdminApi } from "@/test/studio"
import StudioProductEdit from "./StudioProductEdit"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const f = STUDIO_COPY.form
const labels = f.fields
const field = (label: string) => screen.getByLabelText(new RegExp(`^${label.replace(/[()]/g, "\\$&")}`))
const probes = [
  { path: "/studio/products", Component: Landed },
  { path: "/studio/sign-out", Component: Landed },
]

// Arz: 3 of 12 remaining, published, featured, 13 photos.
function renderEdit(id = 1, answer?: Parameters<typeof stubAdminApi>[1]) {
  const fetch = stubAdminApi([adminProductOf(1), adminProductOf(4, { status: "draft" })], answer)
  const view = renderStudioAt(
    <StudioShell>
      <StudioProductEdit />
    </StudioShell>,
    `/studio/products/${id}`,
    {
      pattern: "/studio/products/:id",
      auth: fakeAdminAuth({ signedInAs: "omar@example.com" }),
      routes: probes,
    },
  )
  return { ...view, fetch }
}

const saveButton = () => screen.getByRole("button", { name: new RegExp(`^(${f.save}|${f.noChanges}|${f.saving})$`) })

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

describe("the studio's edit page", () => {
  it("loads the piece into the form", async () => {
    renderEdit()
    expect(screen.getByRole("status")).toHaveTextContent(f.loading)
    expect(await screen.findByRole("heading", { level: 1, name: "Arz" })).toBeInTheDocument()
    expect(field(labels.name)).toHaveValue("Arz")
    expect(field(labels.price)).toHaveValue("420")
    expect(field(labels.remaining)).toHaveValue("3")
    expect(screen.getByRole("radio", { name: f.published })).toBeChecked()
    expect(screen.getByRole("switch", { name: f.featured })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("link", { name: `← ${f.back}` })).toHaveAttribute("href", "/studio/products")
    expect(screen.getByText(STUDIO_COPY.website)).toBeInTheDocument()
  })

  it("has nothing to save until something really changes", async () => {
    const { fetch } = renderEdit()
    await screen.findByRole("heading", { name: "Arz" })
    expect(saveButton()).toBeDisabled()
    expect(saveButton()).toHaveTextContent(f.noChanges)
    const user = userEvent.setup()
    await user.clear(field(labels.price))
    await user.type(field(labels.price), "420.00")
    await user.type(field(labels.name), "  ")
    expect(saveButton()).toBeDisabled()
    expect(bodiesOf(fetch, "PATCH")).toEqual([])
  })

  it("sends only what changed, then has nothing left to save", async () => {
    const { fetch } = renderEdit()
    await screen.findByRole("heading", { name: "Arz" })
    const user = userEvent.setup()
    await user.clear(field(labels.price))
    await user.type(field(labels.price), "450")
    expect(screen.getByText(f.unsaved)).toBeInTheDocument()
    await user.click(saveButton())
    await waitFor(() => expect(bodiesOf(fetch, "PATCH")).toEqual([{ price: 450 }]))
    expect(toast.success).toHaveBeenCalledWith(f.savedToast, { position: "top-center" })
    await waitFor(() => expect(saveButton()).toHaveTextContent(f.noChanges))
    expect(readDraft(1)).toBeNull()
  })

  it("hides a piece by making it a draft, and features it with the switch", async () => {
    const { fetch } = renderEdit()
    await screen.findByRole("heading", { name: "Arz" })
    const user = userEvent.setup()
    await user.click(screen.getByRole("radio", { name: f.draft }))
    await user.click(screen.getByRole("switch", { name: f.featured }))
    await user.click(saveButton())
    await waitFor(() => expect(bodiesOf(fetch, "PATCH")).toEqual([{ status: "draft", featured: false }]))
  })

  it("checks the values before sending, and focuses the first problem", async () => {
    const { fetch } = renderEdit()
    await screen.findByRole("heading", { name: "Arz" })
    const user = userEvent.setup()
    await user.clear(field(labels.remaining))
    await user.type(field(labels.remaining), "13")
    await user.clear(field(labels.price))
    await user.type(field(labels.price), "0")
    await user.click(saveButton())
    expect(field(labels.price)).toHaveAccessibleDescription(f.errors.positive)
    expect(field(labels.remaining)).toHaveAccessibleDescription(f.errors.aboveEdition)
    expect(field(labels.price)).toHaveFocus()
    expect(screen.getByRole("alert")).toHaveTextContent(f.fixErrors)
    expect(bodiesOf(fetch, "PATCH")).toEqual([])
  })

  it("puts the API's message on the field it names", async () => {
    renderEdit(1, (method) => (method === "PATCH" ? failure(400, "VALIDATION", "remaining can't be more than editionSize") : undefined))
    await screen.findByRole("heading", { name: "Arz" })
    const user = userEvent.setup()
    await user.clear(field(labels.remaining))
    await user.type(field(labels.remaining), "4")
    await user.click(saveButton())
    await waitFor(() => expect(field(labels.remaining)).toHaveAccessibleDescription("remaining can't be more than editionSize"))
    expect(field(labels.remaining)).toHaveFocus()
  })

  it("puts a name clash on the name", async () => {
    renderEdit(4, (method) => (method === "PATCH" ? failure(409, "CONFLICT", "A published piece already has that name") : undefined))
    await screen.findByRole("heading", { name: "Jbeil" })
    const user = userEvent.setup()
    await user.click(screen.getByRole("radio", { name: f.published }))
    await user.click(saveButton())
    await waitFor(() => expect(field(labels.name)).toHaveAccessibleDescription("A published piece already has that name"))
  })

  it("keeps a message the API doesn't tie to a field for the whole form", async () => {
    renderEdit(1, (method) => (method === "PATCH" ? failure(400, "VALIDATION", "That value isn't allowed") : undefined))
    await screen.findByRole("heading", { name: "Arz" })
    const user = userEvent.setup()
    await user.type(field(labels.color), " light")
    await user.click(saveButton())
    expect(await screen.findByRole("alert")).toHaveTextContent("That value isn't allowed")
  })

  it("says so when the save doesn't reach the API", async () => {
    renderEdit(1, (method) => (method === "PATCH" ? new Response("Bad gateway", { status: 502 }) : undefined))
    await screen.findByRole("heading", { name: "Arz" })
    const user = userEvent.setup()
    await user.type(field(labels.color), " light")
    await user.click(saveButton())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(f.saveFailed, { position: "top-center" }))
    expect(screen.getByText(f.unsaved)).toBeInTheDocument()
  })

  it("shows the studio's not-found for an unknown piece", async () => {
    renderEdit(42)
    expect(await screen.findByRole("heading", { level: 1, name: STUDIO_COPY.notFound.title })).toBeInTheDocument()
  })

  it("explains a failed load and tries again", async () => {
    let calls = 0
    renderEdit(1, () => (calls++ === 0 ? new Response("Bad gateway", { status: 502 }) : undefined))
    expect(await screen.findByRole("alert")).toHaveTextContent(f.loadFailed)
    await userEvent.setup().click(screen.getByRole("button", { name: f.retry }))
    expect(await screen.findByRole("heading", { name: "Arz" })).toBeInTheDocument()
  })

  it("shows the photos in the API's order, each with its moves", async () => {
    renderEdit()
    await screen.findByRole("heading", { name: "Arz" })
    const photos = screen.getByRole("region", { name: f.photos })
    const images = within(photos).getAllByRole("img")
    expect(images).toHaveLength(adminProductOf(1).images.length)
    expect(images.map((img) => img.getAttribute("src"))).toEqual(adminProductOf(1).images.map((photo) => `${photo.url}/480.webp`))
    expect(images[0]).toHaveAccessibleName("Photo 1 of 13, Cover")
    expect(within(photos).getByRole("button", { name: "Delete photo 13" })).toBeInTheDocument()
  })

  it("previews the edition line the shop will show", async () => {
    renderEdit()
    await screen.findByRole("heading", { name: "Arz" })
    expect(screen.getByText("Shown on the site as “Edition of 12 — 3 remaining”.")).toBeInTheDocument()
    const user = userEvent.setup()
    await user.clear(field(labels.remaining))
    await user.type(field(labels.remaining), "0")
    expect(screen.getByText("Shown on the site as “Sold out”.")).toBeInTheDocument()
  })

  it("asks before leaving with unsaved changes, by a link or by signing out", async () => {
    renderEdit()
    await screen.findByRole("heading", { name: "Arz" })
    const user = userEvent.setup()
    await user.type(field(labels.color), " light")
    await user.click(screen.getByRole("link", { name: `← ${f.back}` }))
    const dialog = await screen.findByRole("alertdialog", { name: STUDIO_COPY.leave.title })
    await user.click(within(dialog).getByRole("button", { name: STUDIO_COPY.leave.stay }))
    expect(field(labels.color)).toHaveValue("Warm beige light")
    await user.click(screen.getAllByRole("link", { name: STUDIO_COPY.shell.signOut })[0])
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: STUDIO_COPY.leave.leave }))
    expect(await landedOn("/studio/sign-out")).toBeInTheDocument()
  })

  it("leaves without asking once everything is saved", async () => {
    renderEdit()
    await screen.findByRole("heading", { name: "Arz" })
    const user = userEvent.setup()
    await user.type(field(labels.color), " light")
    await user.click(saveButton())
    await waitFor(() => expect(saveButton()).toHaveTextContent(f.noChanges))
    await user.click(screen.getByRole("link", { name: `← ${f.back}` }))
    expect(await landedOn("/studio/products")).toBeInTheDocument()
  })
})
