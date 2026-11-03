import { screen, waitFor, within } from "@testing-library/react"
import { toast } from "sonner"
import type { Announcement } from "@/features/studio/announcements"
import { STUDIO_COPY } from "@/features/studio/copy"
import { renderStudioAt } from "@/test/render-studio"
import { adminProductOf, failure, fakeAdminAuth, ok, setupUser } from "@/test/studio"
import StudioAnnouncements from "./StudioAnnouncements"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const t = STUDIO_COPY.announcements
const PLACE = { position: "top-center" }

const earlier: Announcement = { id: 2, subject: "Two new pieces", message: "Atera is ready.\n\nArz too.", productId: 6, recipients: 2, sentAt: "2026-10-28T09:30:00.000Z" }
const older: Announcement = { id: 1, subject: "Hello", message: "The first one.", productId: null, recipients: 1, sentAt: "2026-10-20T09:30:00.000Z" }
// Omar's order, a draft among them: only published pieces may be featured.
const pieces = [
  adminProductOf(5, { name: "Tura" }),
  adminProductOf(2, { name: "Draft piece", status: "draft" }),
  adminProductOf(6, { name: "Atera" }),
  adminProductOf(1, { name: "Arz" }),
]

interface Api {
  subscribers?: number
  announcements?: Announcement[]
  test?: () => Response | Promise<Response>
  send?: (body: Record<string, unknown>) => Response | Promise<Response>
}

function serve({ subscribers = 3, announcements = [earlier, older], test, send }: Api = {}) {
  let list = announcements
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname
    const method = init?.method ?? "GET"
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {}
    if (path === "/admin/products") return ok(pieces)
    if (path === "/admin/announcements" && method === "GET") return ok({ subscribers, announcements: list })
    if (path === "/admin/announcements/test") return test ? test() : ok({ sentTo: "omar@example.com" })
    if (path === "/admin/announcements" && method === "POST") {
      const answer = send ? await send(body) : ok({ id: 3, subject: body.subject, message: body.message, productId: body.productId, recipients: subscribers, sentAt: "2026-11-03T10:00:00.000Z" }, 201)
      if (answer.status === 201) list = [(await answer.clone().json()).data as Announcement, ...list]
      return answer
    }
    return failure(404, "NOT_FOUND", "Not found")
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

const posts = (fetch: ReturnType<typeof serve>, path: string) =>
  fetch.mock.calls.filter(([url, init]) => new URL(String(url)).pathname === path && init?.method === "POST").map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>)

function open() {
  renderStudioAt(<StudioAnnouncements />, "/studio/announcements", { auth: fakeAdminAuth({ signedInAs: "omar@example.com" }) })
}

async function compose(user: ReturnType<typeof setupUser>, subject = "A new edition", message = "Hello.\n\nTura is back.") {
  await user.type(await screen.findByLabelText(t.subject), subject)
  await user.type(screen.getByLabelText(t.message), message)
}

let uuids = 0
beforeEach(() => {
  uuids = 0
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `00000000-0000-4000-8000-00000000000${++uuids}` as `${string}-${string}-${string}-${string}-${string}`)
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe("the studio's announcements", () => {
  it("lists what was sent, newest first, with the date, subject, count and featured piece, and opens a message to read", async () => {
    serve()
    open()
    const rows = within(await screen.findByRole("list", { name: t.history })).getAllByRole("listitem")
    expect(rows).toHaveLength(2)
    for (const text of ["28 Oct 2026", "Two new pieces", "sent to 2", "Featuring Atera"]) expect(within(rows[0]).getByText(text)).toBeInTheDocument()
    expect(within(rows[1]).queryByText(/Featuring/)).not.toBeInTheDocument()
    const user = setupUser()
    await user.click(within(rows[0]).getByText("Two new pieces"))
    expect(within(rows[0]).getByText("Atera is ready.")).toBeVisible()
    expect(within(rows[0]).getByText("Arz too.")).toBeVisible()
  })

  it("says when nothing has been sent yet", async () => {
    serve({ announcements: [] })
    open()
    expect(await screen.findByText(t.empty)).toBeInTheDocument()
  })

  it("offers only published pieces to feature, in Omar's order, with None chosen first", async () => {
    serve()
    open()
    const group = await screen.findByRole("radiogroup", { name: t.feature })
    const options = within(group).getAllByRole("radio")
    expect(options.map((o) => o.getAttribute("aria-label") ?? o.closest("label")?.textContent)).toEqual([t.none, "Tura", "Atera", "Arz"])
    expect(within(group).getByRole("radio", { name: t.none })).toBeChecked()
    expect(screen.getByText(t.messageHint)).toBeInTheDocument()
  })

  it("sends a test of the draft to Omar alone and says where it went", async () => {
    const fetch = serve()
    open()
    const user = setupUser()
    await compose(user)
    await user.click(within(screen.getByRole("radiogroup", { name: t.feature })).getByRole("radio", { name: "Tura" }))
    await user.click(screen.getByRole("button", { name: t.sendTest }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Test sent to omar@example.com", PLACE))
    expect(posts(fetch, "/admin/announcements/test")).toEqual([{ subject: "A new edition", message: "Hello.\n\nTura is back.", productId: 5 }])
    expect(posts(fetch, "/admin/announcements")).toEqual([])
    expect(screen.getByLabelText(t.subject)).toHaveValue("A new edition")
  })

  it("asks before sending to all, naming how many, and sends nothing on Not yet", async () => {
    const fetch = serve()
    open()
    const user = setupUser()
    await compose(user)
    await user.click(screen.getByRole("button", { name: t.sendAll }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("Send to 3 subscribers?")
    expect(dialog).toHaveTextContent("This can't be undone.")
    await user.click(within(dialog).getByRole("button", { name: t.keep }))
    expect(posts(fetch, "/admin/announcements")).toEqual([])
  })

  it("sends to all once, says how many it went to, clears the form and shows it first in the list", async () => {
    let finish: (answer: Response) => void = () => {}
    const fetch = serve({ send: (body) => new Promise((done) => (finish = () => done(ok({ ...earlier, id: 3, subject: body.subject as string, recipients: 3, sentAt: "2026-11-03T10:00:00.000Z" }, 201)))) })
    open()
    const user = setupUser()
    await compose(user)
    await user.click(screen.getByRole("button", { name: t.sendAll }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: t.confirm }))
    const sending = await screen.findByRole("button", { name: t.sending })
    expect(sending).toBeDisabled()
    expect(screen.getByRole("button", { name: t.sendTest })).toBeDisabled()
    await user.click(sending)
    finish(new Response())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Sent to 3 people", PLACE))
    expect(posts(fetch, "/admin/announcements")).toEqual([{ requestId: "00000000-0000-4000-8000-000000000001", subject: "A new edition", message: "Hello.\n\nTura is back.", productId: null }])
    expect(screen.getByLabelText(t.subject)).toHaveValue("")
    expect(screen.getByLabelText(t.message)).toHaveValue("")
    const rows = within(await screen.findByRole("list", { name: t.history })).getAllByRole("listitem")
    await waitFor(() => expect(within(rows[0]).getByText("A new edition")).toBeInTheDocument())
  })

  it("keeps the request id when the same announcement is tried again, and makes a new one after it went out", async () => {
    let tries = 0
    const fetch = serve({ send: () => (++tries === 1 ? failure(502, "UNAVAILABLE", "Bad gateway") : ok({ ...earlier, id: 3, recipients: 3 }, 201)) })
    open()
    const user = setupUser()
    const sendAll = async () => {
      await user.click(screen.getByRole("button", { name: t.sendAll }))
      await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: t.confirm }))
    }
    await compose(user)
    await sendAll()
    expect(await screen.findByRole("alert")).toHaveTextContent("Bad gateway")
    expect(screen.getByLabelText(t.subject)).toHaveValue("A new edition")
    await sendAll()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Sent to 3 people", PLACE))
    await compose(user, "Another", "Second.")
    await sendAll()
    await waitFor(() => expect(posts(fetch, "/admin/announcements")).toHaveLength(3))
    expect(posts(fetch, "/admin/announcements").map((body) => body.requestId)).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ])
  })

  it("makes a new request id when Omar starts a new one", async () => {
    const fetch = serve({ send: () => failure(502, "UNAVAILABLE", "Bad gateway") })
    open()
    const user = setupUser()
    await compose(user)
    await user.click(screen.getByRole("button", { name: t.sendAll }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: t.confirm }))
    await screen.findByRole("alert")
    await user.click(screen.getByRole("button", { name: t.startNew }))
    expect(screen.getByLabelText(t.subject)).toHaveValue("")
    await compose(user, "Fresh", "New text.")
    await user.click(screen.getByRole("button", { name: t.sendAll }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: t.confirm }))
    await waitFor(() => expect(posts(fetch, "/admin/announcements")).toHaveLength(2))
    expect(posts(fetch, "/admin/announcements")[1].requestId).toBe("00000000-0000-4000-8000-000000000002")
  })

  it("shows the API's message as it is", async () => {
    serve({ test: () => failure(400, "VALIDATION", "Please write a subject (up to 150 characters).") })
    open()
    const user = setupUser()
    await user.type(await screen.findByLabelText(t.message), "Only a message.")
    await user.click(screen.getByRole("button", { name: t.sendTest }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Please write a subject (up to 150 characters).")
    expect(toast.error).toHaveBeenCalledWith("Please write a subject (up to 150 characters).", PLACE)
  })

  it("can't send to all while nobody has joined", async () => {
    serve({ subscribers: 0 })
    open()
    const user = setupUser()
    await compose(user)
    expect(screen.getByRole("button", { name: t.sendAll })).toBeDisabled()
    expect(screen.getByText(t.nobody)).toBeInTheDocument()
  })
})
