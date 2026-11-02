import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import type { AdminProduct } from "@/features/catalog/types"
import { STUDIO_COPY } from "@/features/studio/copy"
import { renderStudioAt } from "@/test/render-studio"
import { adminProductOf, failure, fakeAdminAuth, ok, setupUser, unauthorized } from "@/test/studio"
import StudioProducts from "./StudioProducts"

const t = STUDIO_COPY.list

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Newest first, as the API orders them: a draft without photos, then the six real pieces (Nahr sold out).
const pieces: AdminProduct[] = [
  adminProductOf(6, { id: 7, name: "Studio check", status: "draft", images: [], featured: false }),
  ...[6, 5, 4, 3, 2, 1].map((id) => adminProductOf(id)),
]

function stubApi(
  answers: { list?: () => Response; patch?: (body: unknown) => Response; publish?: () => Response | Promise<Response>; order?: (ids: number[]) => Response } = {},
) {
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname
    if (path === "/admin/publish") return answers.publish?.() ?? ok({ started: true }, 202)
    if (path === "/admin/products/order") {
      const ids = (JSON.parse(String(init?.body)) as { productIds: number[] }).productIds
      return answers.order?.(ids) ?? ok(ids.map((id) => pieces.find((p) => p.id === id)))
    }
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

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

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
    await setupUser().click(star)
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
    await setupUser().click(within(rowOf("Arz")).getByRole("button", { name: "Stop featuring Arz on the home page" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(t.featureFailed, { position: "top-center" }))
    expect(within(rowOf("Arz")).getByRole("button", { name: "Stop featuring Arz on the home page" })).toHaveAttribute("aria-pressed", "true")
  })

  // The session ended: the admin is sent to sign in, as everywhere in the studio, without a "couldn't save" on the way.
  it("says nothing about the star when the session has ended", async () => {
    const auth = fakeAdminAuth({ signedInAs: "omar@example.com" })
    stubApi({ patch: () => unauthorized() })
    renderStudioAt(<StudioProducts />, "/studio/products", { auth })
    await screen.findByRole("link", { name: "Arz" })
    await setupUser().click(within(rowOf("Arz")).getByRole("button", { name: "Stop featuring Arz on the home page" }))
    await waitFor(() => expect(auth.clearSession).toHaveBeenCalled())
    expect(toast.error).not.toHaveBeenCalled()
  })

  // Two quick taps would send two saves that can land in either order: the second waits for the first.
  it("ignores a second tap on a star while its first change is being saved", async () => {
    let answer: (response: Response) => void = () => {}
    const fetch = stubApi({ patch: () => undefined as unknown as Response })
    fetch.mockImplementation(async (_url: string | URL | Request, init?: RequestInit) =>
      init?.method === "PATCH" ? new Promise<Response>((done) => (answer = done)) : ok(pieces),
    )
    renderList()
    await screen.findByRole("link", { name: "Nahr" })
    const user = setupUser()
    await user.click(within(rowOf("Nahr")).getByRole("button", { name: "Feature Nahr on the home page" }))
    await user.click(within(rowOf("Nahr")).getByRole("button", { name: "Stop featuring Nahr on the home page" }))
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1)
    answer(ok({ ...pieces.find((p) => p.name === "Nahr"), featured: true }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(within(rowOf("Nahr")).getByRole("button", { name: "Stop featuring Nahr on the home page" })).toHaveAttribute("aria-pressed", "true")
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
    await setupUser().click(screen.getByRole("button", { name: t.retry }))
    expect(await screen.findByRole("link", { name: "Arz" })).toBeInTheDocument()
  })
})

// The shop is built ahead of time; Publish asks for a rebuild (POST /admin/publish). There's no status to follow, so
// the button rests for the 2 minutes a rebuild takes, in this tab.
describe("publishing the website", () => {
  const publishButton = () => screen.getByRole("button", { name: new RegExp(`^(${t.publish}|${t.publishing})$`) })
  const publishCalls = (fetch: ReturnType<typeof stubApi>) => fetch.mock.calls.filter(([url]) => String(url).endsWith("/admin/publish"))

  afterEach(() => vi.useRealTimers())

  it("sits in the header beside New product, under which the note still explains it", () => {
    stubApi()
    renderList()
    const header = screen.getByRole("heading", { level: 1, name: t.title }).parentElement as HTMLElement
    expect(within(header).getByRole("button", { name: t.publish })).toBeEnabled()
    expect(within(header).getByRole("link", { name: `+ ${t.newProduct}` })).toBeInTheDocument()
    expect(screen.getByText(STUDIO_COPY.website)).toBeInTheDocument()
  })

  it("starts a publish, says when the website updates, and rests for 2 minutes in this tab", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetch = stubApi()
    const view = renderList()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(publishButton())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(t.publishStarted, { position: "top-center" }))
    expect(publishCalls(fetch)).toHaveLength(1)
    expect(publishCalls(fetch)[0][1]).toMatchObject({ method: "POST" })
    expect(publishButton()).toBeDisabled()
    expect(publishButton()).toHaveTextContent(t.publishing)

    // Back on the list later in the same tab: still resting.
    view.unmount()
    await act(() => vi.advanceTimersByTimeAsync(100_000))
    renderList()
    expect(publishButton()).toBeDisabled()
    await act(() => vi.advanceTimersByTimeAsync(21_000))
    expect(publishButton()).toBeEnabled()
    expect(publishButton()).toHaveTextContent(t.publish)
  })

  it("shows the API's message when publishing couldn't start, and stays ready", async () => {
    const message = "Publishing couldn't start. Try again in a minute."
    stubApi({ publish: () => failure(502, "PUBLISH_FAILED", message) })
    renderList()
    await setupUser().click(publishButton())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message, { position: "top-center" }))
    expect(toast.success).not.toHaveBeenCalled()
    expect(publishButton()).toBeEnabled()
    expect(publishButton()).toHaveTextContent(t.publish)
  })

  it("says so in its own words when the answer isn't the API's", async () => {
    stubApi({ publish: () => new Response("Bad gateway", { status: 502 }) })
    renderList()
    await setupUser().click(publishButton())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(t.publishFailed, { position: "top-center" }))
    expect(publishButton()).toBeEnabled()
  })

  it("says nothing when the session has ended", async () => {
    const auth = fakeAdminAuth({ signedInAs: "omar@example.com" })
    stubApi({ publish: () => unauthorized() })
    renderStudioAt(<StudioProducts />, "/studio/products", { auth })
    await setupUser().click(publishButton())
    await waitFor(() => expect(auth.clearSession).toHaveBeenCalled())
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  // Vercel takes about 7 s to accept a build and the API waits up to 20 s for it ("Publish the website"): the studio
  // sets no shorter limit, shows the waiting state all along, and a click while it waits sends nothing.
  it.each([7_000, 19_000])("waits %i ms for the answer: Publishing… and disabled throughout, a second click ignored", async (wait) => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetch = stubApi({ publish: () => new Promise((resolve) => setTimeout(() => resolve(ok({ started: true }, 202)), wait)) })
    renderList()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(publishButton())
    for (let waited = 0; waited < wait - 1000; waited += 1000) {
      await act(() => vi.advanceTimersByTimeAsync(1000))
      expect(publishButton()).toBeDisabled()
      expect(publishButton()).toHaveTextContent(t.publishing)
      await user.click(publishButton())
    }
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(t.publishStarted, { position: "top-center" }))
    expect(toast.error).not.toHaveBeenCalled()
    expect(publishCalls(fetch)).toHaveLength(1)
    expect(publishButton()).toBeDisabled()
  })

  it("sends one publish for a double click", async () => {
    const fetch = stubApi()
    renderList()
    const user = setupUser()
    await user.dblClick(publishButton())
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
    expect(publishCalls(fetch)).toHaveLength(1)
  })
})

// Omar's order of the collection (contract, "Arrange the pieces", 2026-11-02): the list is already in it; Arrange lets
// him move pieces by dragging a handle (a finger on iPhone, or a mouse) or with the arrows, then save or cancel.
describe("arranging the pieces", () => {
  const a = STUDIO_COPY.arrange
  const all = /^(Studio check|Sannine|Qadisha|Jbeil|Batroun|Nahr|Arz)$/
  const startOrder = ["Studio check", "Sannine", "Qadisha", "Jbeil", "Batroun", "Nahr", "Arz"]
  const order = () => within(screen.getByRole("list", { name: a.listLabel })).getAllByRole("listitem")
  const namesInOrder = () => order().map((row) => row.querySelector("[data-name]")?.textContent)
  const ids = (names: string[]) => names.map((name) => pieces.find((p) => p.name === name)!.id)

  async function arrange(user = userEvent.setup()) {
    renderList()
    await screen.findByRole("link", { name: "Arz" })
    await user.click(screen.getByRole("button", { name: a.open }))
    return user
  }

  it("shows every piece with its position, a handle and arrows, and nothing to save until something moves", async () => {
    stubApi()
    await arrange()
    expect(order().map((row) => row.querySelector("[data-position]")?.textContent)).toEqual(["1", "2", "3", "4", "5", "6", "7"])
    expect(namesInOrder()).toEqual(startOrder)
    expect(screen.getByRole("button", { name: "Drag Qadisha to a new place" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move Studio check up" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Move Arz down" })).toBeDisabled()
    expect(screen.getByRole("button", { name: a.save })).toBeDisabled()
    expect(screen.queryByRole("link", { name: "Qadisha" })).not.toBeInTheDocument()
  })

  it("moves a piece with the arrows, saves the whole order, and says the shop follows after the next publish", async () => {
    const fetch = stubApi()
    const user = await arrange()
    await user.click(screen.getByRole("button", { name: "Move Arz up" }))
    await user.click(screen.getByRole("button", { name: "Move Qadisha up" }))
    const moved = ["Studio check", "Qadisha", "Sannine", "Jbeil", "Batroun", "Arz", "Nahr"]
    expect(namesInOrder()).toEqual(moved)
    expect(screen.getByRole("status", { name: a.announcer })).toHaveTextContent("Qadisha is now number 2 of 7.")
    await user.click(screen.getByRole("button", { name: a.save }))
    const put = fetch.mock.calls.find(([url]) => String(url).endsWith("/admin/products/order"))!
    expect(put[1]?.method).toBe("PUT")
    expect(JSON.parse(String(put[1]?.body))).toEqual({ productIds: ids(moved) })
    await waitFor(() => expect(screen.queryByRole("list", { name: a.listLabel })).not.toBeInTheDocument())
    expect(screen.getAllByRole("link", { name: all }).map((link) => link.textContent)).toEqual(moved)
    expect(toast.success).toHaveBeenCalledWith(a.saved, { description: a.followsPublish, position: "top-center" })
  })

  it("puts everything back on Cancel, sending nothing", async () => {
    const fetch = stubApi()
    const user = await arrange()
    await user.click(screen.getByRole("button", { name: "Move Arz up" }))
    await user.click(screen.getByRole("button", { name: a.cancel }))
    expect(screen.getAllByRole("link", { name: all }).map((link) => link.textContent)).toEqual(startOrder)
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/admin/products/order"))).toBe(false)
  })

  it("on a stale list, says so in the API's words, reloads the list and lets him arrange again", async () => {
    const message = "Send every piece exactly once. If a piece was just added or deleted, reload the list."
    const fetch = stubApi({ order: () => failure(400, "VALIDATION_ERROR", message) })
    const user = await arrange()
    await user.click(screen.getByRole("button", { name: "Move Arz up" }))
    await user.click(screen.getByRole("button", { name: a.save }))
    expect(await screen.findByRole("alert")).toHaveTextContent(message)
    const reads = fetch.mock.calls.filter(([url, init]) => String(url).endsWith("/admin/products") && (init?.method ?? "GET") === "GET")
    expect(reads).toHaveLength(2)
    expect(namesInOrder()).toEqual(startOrder)
  })

  it("keeps the new order on screen when the save doesn't go through", async () => {
    stubApi({ order: () => failure(500, "INTERNAL", "Something went wrong") })
    const user = await arrange()
    await user.click(screen.getByRole("button", { name: "Move Arz up" }))
    await user.click(screen.getByRole("button", { name: a.save }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(a.saveFailed, { position: "top-center" }))
    expect(namesInOrder()).toEqual(["Studio check", "Sannine", "Qadisha", "Jbeil", "Batroun", "Arz", "Nahr"])
  })

  it("moves the focused handle's piece with the arrow keys", async () => {
    stubApi()
    const user = await arrange()
    screen.getByRole("button", { name: "Drag Sannine to a new place" }).focus()
    await user.keyboard("{ArrowDown}{ArrowDown}")
    expect(namesInOrder()).toEqual(["Studio check", "Qadisha", "Jbeil", "Sannine", "Batroun", "Nahr", "Arz"])
    expect(screen.getByRole("button", { name: "Drag Sannine to a new place" })).toHaveFocus()
  })

  it("moves a piece where it is dragged by its handle (a finger or a mouse)", async () => {
    stubApi()
    await arrange()
    // jsdom does no layout: each row is 60px tall, one under the other.
    order().forEach((row, i) => {
      row.getBoundingClientRect = () => ({ top: i * 60, bottom: i * 60 + 60, height: 60, left: 0, right: 400, width: 400 }) as DOMRect
    })
    const handle = screen.getByRole("button", { name: "Drag Arz to a new place" })
    act(() => {
      handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientY: 390, pointerType: "touch" }))
    })
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientY: 100, pointerType: "touch" }))
    })
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientY: 100, pointerType: "touch" }))
    })
    expect(namesInOrder()).toEqual(["Studio check", "Arz", "Sannine", "Qadisha", "Jbeil", "Batroun", "Nahr"])
    expect(screen.getByRole("button", { name: a.save })).toBeEnabled()
  })

  // Found in the browser (2026-11-02): a browser may refuse pointer capture, and the drag must still go on.
  it("still drags when the browser refuses to capture the pointer", async () => {
    stubApi()
    await arrange()
    order().forEach((row, i) => {
      row.getBoundingClientRect = () => ({ top: i * 60, bottom: i * 60 + 60, height: 60, left: 0, right: 400, width: 400 }) as DOMRect
    })
    const handle = screen.getByRole("button", { name: "Drag Arz to a new place" })
    handle.setPointerCapture = () => {
      throw new DOMException("No active pointer", "NotFoundError")
    }
    act(() => {
      handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, clientY: 390, pointerType: "touch" }))
    })
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 9, clientY: 30, pointerType: "touch" }))
    })
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, clientY: 30, pointerType: "touch" }))
    })
    expect(namesInOrder()[0]).toBe("Arz")
  })
})
