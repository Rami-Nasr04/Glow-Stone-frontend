import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import type { AdminProduct } from "@/features/catalog/types"
import { STUDIO_COPY } from "@/features/studio/copy"
import { renderStudioAt } from "@/test/render-studio"
import { adminProductOf, fakeAdminAuth, failure, ok } from "@/test/studio"
import StudioProducts from "./StudioProducts"

const t = STUDIO_COPY.list

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Newest first, as the API orders them: a draft without photos, then the six real pieces (Nahr sold out).
const pieces: AdminProduct[] = [
  adminProductOf(6, { id: 7, name: "Studio check", status: "draft", images: [], featured: false }),
  ...[6, 5, 4, 3, 2, 1].map((id) => adminProductOf(id)),
]

function stubApi(answers: { list?: () => Response; patch?: (body: unknown) => Response } = {}) {
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname
    if (init?.method === "PATCH") {
      const id = Number(path.split("/").pop())
      const body = JSON.parse(String(init.body)) as Partial<AdminProduct>
      return answers.patch?.(body) ?? ok({ ...pieces.find((p) => p.id === id), ...body })
    }
    return answers.list?.() ?? ok(pieces)
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

function renderList() {
  return renderStudioAt(<StudioProducts />, "/studio/products", { auth: fakeAdminAuth({ signedInAs: "omar@example.com" }) })
}

const rowOf = (name: string) => screen.getByRole("link", { name }).closest("li") as HTMLElement

beforeEach(() => vi.mocked(toast.success).mockClear())

describe("the studio's products list", () => {
  it("lists every piece, drafts included, in the API's order", async () => {
    stubApi()
    renderList()
    expect(screen.getByRole("status")).toHaveTextContent(t.loading)
    const names = await screen.findAllByRole("link", { name: /^(Studio check|Sannine|Qadisha|Jbeil|Batroun|Nahr|Arz)$/ })
    expect(names.map((link) => link.textContent)).toEqual(["Studio check", "Sannine", "Qadisha", "Jbeil", "Batroun", "Nahr", "Arz"])
    expect(screen.getByRole("link", { name: "Qadisha" })).toHaveAttribute("href", "/studio/products/5")
  })

  it("shows stone, price, stock and status, with a mark beside every status", async () => {
    stubApi()
    renderList()
    await screen.findByRole("link", { name: "Arz" })
    const arz = rowOf("Arz")
    expect(arz).toHaveTextContent("Warm beige limestone")
    expect(arz).toHaveTextContent("$420")
    expect(arz).toHaveTextContent("3 of 12")
    expect(within(arz).getByText(t.published).parentElement).toHaveTextContent("●")
    expect(rowOf("Nahr")).toHaveTextContent(t.soldOut)
    expect(within(rowOf("Studio check")).getByText(t.draft).parentElement).toHaveTextContent("◇")
  })

  it("shows each cover uncropped, or the empty stone frame", async () => {
    stubApi()
    renderList()
    await screen.findByRole("link", { name: "Arz" })
    const cover = rowOf("Arz").querySelector("img") as HTMLImageElement
    expect(cover.getAttribute("src")).toBe(`${pieces[6].images[0].url}/480.webp`)
    expect(cover).toHaveAttribute("alt", "")
    expect(cover.className).toContain("object-contain")
    expect(rowOf("Studio check").querySelector("[data-no-photo]")).not.toBeNull()
  })

  it("features a piece with the star, sending only that field", async () => {
    const fetch = stubApi()
    renderList()
    await screen.findByRole("link", { name: "Nahr" })
    const star = within(rowOf("Nahr")).getByRole("button", { name: "Feature Nahr on the home page" })
    expect(star).toHaveAttribute("aria-pressed", "false")
    await userEvent.setup().click(star)
    const patch = fetch.mock.calls.find(([, init]) => init?.method === "PATCH")
    expect(String(patch?.[0])).toBe("https://api.test/admin/products/2")
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ featured: true })
    await waitFor(() => expect(within(rowOf("Nahr")).getByRole("button", { name: "Stop featuring Nahr on the home page" })).toHaveAttribute("aria-pressed", "true"))
    // Top centre: top-right would cover "New product" and the stars.
    expect(toast.success).toHaveBeenCalledWith("Nahr is featured.", { description: STUDIO_COPY.form.savedToast, position: "top-center" })
  })

  it("puts the star back and says so when the change isn't saved", async () => {
    stubApi({ patch: () => failure(500, "INTERNAL", "Something went wrong") })
    renderList()
    await screen.findByRole("link", { name: "Arz" })
    await userEvent.setup().click(within(rowOf("Arz")).getByRole("button", { name: "Stop featuring Arz on the home page" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(t.featureFailed, { position: "top-center" }))
    expect(within(rowOf("Arz")).getByRole("button", { name: "Stop featuring Arz on the home page" })).toHaveAttribute("aria-pressed", "true")
  })

  it("says that changes reach the website at the next publish", async () => {
    stubApi()
    renderList()
    expect(screen.getByText(STUDIO_COPY.website)).toBeInTheDocument()
  })

  it("leads to a new piece", () => {
    stubApi()
    renderList()
    expect(screen.getByRole("link", { name: `+ ${t.newProduct}` })).toHaveAttribute("href", "/studio/products/new")
  })

  it("has an empty state", async () => {
    stubApi({ list: () => ok([]) })
    renderList()
    expect(await screen.findByText(t.empty)).toBeInTheDocument()
  })

  it("explains a failed load and tries again", async () => {
    let calls = 0
    stubApi({ list: () => (calls++ === 0 ? failure(503, "BUSY", "System is busy") : ok(pieces)) })
    renderList()
    expect(await screen.findByRole("alert")).toHaveTextContent(t.loadFailed)
    await userEvent.setup().click(screen.getByRole("button", { name: t.retry }))
    expect(await screen.findByRole("link", { name: "Arz" })).toBeInTheDocument()
  })
})
