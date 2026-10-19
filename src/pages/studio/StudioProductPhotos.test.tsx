import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub, Outlet } from "react-router"
import AdminAuthProvider from "@/features/studio/auth/AdminAuthProvider"
import RequireAdmin from "@/features/studio/auth/RequireAdmin"
import { STUDIO_COPY } from "@/features/studio/copy"
import { readPendingPhotos } from "@/features/studio/drafts"
import { MAX_PHOTO_BYTES } from "@/features/studio/photos"
import StudioShell from "@/features/studio/StudioShell"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import { adminProductOf, bodiesOf, callsOf, failure, fakeAdminAuth, STORAGE_URL, stubAdminApi, unauthorized } from "@/test/studio"
import StudioProductEdit from "./StudioProductEdit"
import StudioProductNew from "./StudioProductNew"
import StudioSignIn from "./StudioSignIn"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const p = STUDIO_COPY.photos
const f = STUDIO_COPY.form
// Qadisha: 9 photos, ids 501…509.
const QADISHA = adminProductOf(5)
const ids = (from: number[]) => from.map((n) => 500 + n)

function renderPhotos(answer?: Parameters<typeof stubAdminApi>[1]) {
  const fetch = stubAdminApi([QADISHA], answer)
  renderStudioAt(
    <StudioShell>
      <StudioProductEdit />
    </StudioShell>,
    "/studio/products/5",
    {
      pattern: "/studio/products/:id",
      auth: fakeAdminAuth({ signedInAs: "omar@example.com" }),
      routes: [{ path: "/studio/products", Component: Landed }],
    },
  )
  return fetch
}

async function opened() {
  await screen.findByRole("heading", { level: 1, name: QADISHA.name })
  return screen.getByRole("region", { name: f.photos })
}

const altTexts = (region: HTMLElement) => within(region).getAllByRole("img").map((img) => img.getAttribute("alt"))
const fileOf = (name: string, { type = "image/jpeg", size = 2048 } = {}) => {
  const file = new File(["photo"], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

beforeEach(() => sessionStorage.clear())

describe("the photo screen", () => {
  it("shows the photos in order, with the cover and the hover photo named", async () => {
    renderPhotos()
    const region = await opened()
    const alts = altTexts(region)
    expect(alts).toHaveLength(9)
    expect(alts.slice(0, 3)).toEqual(["Photo 1 of 9, Cover", "Photo 2 of 9, Hover", "Photo 3 of 9"])
    expect(within(region).getByText(p.cover)).toBeInTheDocument()
    expect(within(region).getByText(p.hover)).toBeInTheDocument()
    for (const img of within(region).getAllByRole("img")) expect(img.className).toContain("object-contain")
  })

  it("offers only the moves that make sense", async () => {
    renderPhotos()
    const region = await opened()
    expect(within(region).getByRole("button", { name: "Move photo 1 earlier" })).toBeDisabled()
    expect(within(region).getByRole("button", { name: "Make photo 1 the cover" })).toBeDisabled()
    expect(within(region).getByRole("button", { name: "Move photo 9 later" })).toBeDisabled()
    expect(within(region).getByRole("button", { name: "Move photo 2 earlier" })).toBeEnabled()
  })

  it("on a new piece, asks to save it first", async () => {
    stubAdminApi([])
    renderStudioAt(<StudioProductNew />, "/studio/products/new", { auth: fakeAdminAuth({ signedInAs: "omar@example.com" }) })
    const region = screen.getByRole("region", { name: f.photos })
    expect(within(region).getByText(p.saveFirst)).toBeInTheDocument()
    expect(within(region).queryByLabelText(p.add)).toBeNull()
  })
})

describe("adding photos", () => {
  it("takes only JPEG, PNG and WebP, several at a time", async () => {
    renderPhotos()
    await opened()
    const input = screen.getByLabelText(p.add)
    expect(input).toHaveAttribute("type", "file")
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp")
    expect(input).toHaveAttribute("multiple")
    // An invisible layer over the whole button, so scrolling to it brings the whole button clear of the bars.
    expect(input.className).toMatch(/absolute inset-0.*opacity-0/)
    expect(input.closest("label")?.className).toContain("relative")
    expect(input).toHaveAttribute("title", "")
  })

  // Rami saw "No changes" on the save bar after an upload: the photos don't wait for Save, and the page says so.
  it("says under the button, after the format line, that photos save at once", async () => {
    renderPhotos()
    await opened()
    expect(p.saved).toBe("Photos save as soon as you add, move or delete them.")
    expect(screen.getByLabelText(p.add)).toHaveAccessibleDescription(`${p.hint} ${p.saved}`)
    const hint = screen.getByText(p.hint)
    const saved = screen.getByText(p.saved)
    expect(hint.compareDocumentPosition(saved) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(saved.className).toBe(hint.className)
  })

  it("adds each photo with the three calls, one at a time, saying which one is going", async () => {
    let release = () => {}
    const held = new Promise<undefined>((resolve) => (release = () => resolve(undefined)))
    let stored = 0
    const fetch = renderPhotos((_method, path) => (path === STORAGE_URL && ++stored === 2 ? held : undefined))
    await opened()
    const user = userEvent.setup()
    await user.upload(screen.getByLabelText(p.add), [fileOf("a.jpg"), fileOf("b.png", { type: "image/png" }), fileOf("c.webp", { type: "image/webp" })])
    expect(await screen.findByText("Adding photo 2 of 3…")).toBeInTheDocument()
    release()
    expect(await screen.findByText("Added 3 of 3 photos.")).toBeInTheDocument()
    const photoCalls = callsOf(fetch).filter((call) => !call.startsWith("GET"))
    const onePhoto = ["POST /admin/products/5/photos/upload", `POST ${STORAGE_URL}`, "POST /admin/products/5/photos"]
    expect(photoCalls).toEqual([...onePhoto, ...onePhoto, ...onePhoto])
    const form = bodiesOf(fetch, "POST").find((body) => body instanceof FormData) as FormData
    expect([...form.keys()]).toEqual(["key", "policy", "Content-Type", "file"])
    expect(altTexts(screen.getByRole("region", { name: f.photos }))).toHaveLength(12)
  })

  it("says just “Adding photo…” for a single photo", async () => {
    let release = () => {}
    const held = new Promise<undefined>((resolve) => (release = () => resolve(undefined)))
    renderPhotos((_method, path) => (path === STORAGE_URL ? held : undefined))
    await opened()
    await userEvent.setup().upload(screen.getByLabelText(p.add), fileOf("a.jpg"))
    expect(await screen.findByText(p.adding)).toBeInTheDocument()
    release()
    expect(await screen.findByText(p.addedOne)).toBeInTheDocument()
  })

  it("lists each photo that failed with the server's message as sent, and adds the others", async () => {
    let confirms = 0
    renderPhotos((method, path) => {
      if (method !== "POST" || path !== "/admin/products/5/photos") return undefined
      return ++confirms === 1 ? failure(400, "VALIDATION", "This photo is too small for the website (at least 1067 px wide).") : undefined
    })
    await opened()
    await userEvent.setup().upload(screen.getByLabelText(p.add), [fileOf("small.jpg"), fileOf("good.jpg")])
    expect(await screen.findByText("Added 1 of 2 photos.")).toBeInTheDocument()
    const failures = screen.getByRole("alert")
    expect(failures).toHaveTextContent(p.notAddedTitle)
    expect(within(failures).getByText("small.jpg: This photo is too small for the website (at least 1067 px wide).")).toBeInTheDocument()
  })

  it("refuses a photo over 30 MB before any call", async () => {
    const fetch = renderPhotos()
    await opened()
    await userEvent.setup().upload(screen.getByLabelText(p.add), fileOf("huge.jpg", { size: MAX_PHOTO_BYTES + 1 }))
    expect(await screen.findByText("huge.jpg: This photo is larger than 30 MB.")).toBeInTheDocument()
    expect(callsOf(fetch).filter((call) => !call.startsWith("GET"))).toEqual([])
  })

  it("refuses another type with the server's words", async () => {
    renderPhotos()
    await opened()
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(screen.getByLabelText(p.add), fileOf("IMG_1.heic", { type: "image/heic" }))
    expect(await screen.findByText("IMG_1.heic: This file isn't a JPEG, PNG or WebP photo.")).toBeInTheDocument()
  })

  it("shows the 30-photo limit as the server words it", async () => {
    renderPhotos((_method, path) => (path.endsWith("/photos/upload") ? failure(409, "CONFLICT", "A piece can have at most 30 photos.") : undefined))
    await opened()
    await userEvent.setup().upload(screen.getByLabelText(p.add), [fileOf("a.jpg"), fileOf("b.jpg")])
    expect(await screen.findByText("a.jpg: A piece can have at most 30 photos.")).toBeInTheDocument()
    expect(screen.getByText("b.jpg: A piece can have at most 30 photos.")).toBeInTheDocument()
  })

  it("reloads the piece when a confirm says the upload wasn't found, and keeps a photo that had landed", async () => {
    let confirms = 0
    const fetch = renderPhotos((method, path) => {
      if (method !== "POST" || path !== "/admin/products/5/photos") return undefined
      // The first confirm worked on the server but its answer was lost; the repeat says "not found".
      if (++confirms === 1) {
        void fetch(`https://api.test${path}`, { method: "POST", body: JSON.stringify({ uploadId: "upload-1" }) })
        return failure(400, "VALIDATION", "This upload wasn't found. Upload the photo again.")
      }
      return undefined
    })
    await opened()
    const gets = () => callsOf(fetch).filter((call) => call === "GET /admin/products/5").length
    const before = gets()
    await userEvent.setup().upload(screen.getByLabelText(p.add), fileOf("a.jpg"))
    expect(await screen.findByText(p.addedOne)).toBeInTheDocument()
    expect(gets()).toBe(before + 1)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(altTexts(screen.getByRole("region", { name: f.photos }))).toHaveLength(10)
  })
})

describe("ordering photos", () => {
  it("moves a photo earlier with the full id list, and keeps the focus on it", async () => {
    const fetch = renderPhotos()
    const region = await opened()
    const user = userEvent.setup()
    await user.click(within(region).getByRole("button", { name: "Move photo 3 earlier" }))
    await waitFor(() => expect(bodiesOf(fetch, "PUT")).toEqual([{ imageIds: ids([1, 3, 2, 4, 5, 6, 7, 8, 9]) }]))
    expect(await screen.findByText("Photo 3 is now photo 2.")).toBeInTheDocument()
    expect(within(region).getByRole("button", { name: "Move photo 2 earlier" })).toHaveFocus()
    expect(within(region).getAllByRole("img")[1]).toHaveAttribute("src", `${QADISHA.images[2].url}/480.webp`)
  })

  it("moves a photo later", async () => {
    const fetch = renderPhotos()
    const region = await opened()
    await userEvent.setup().click(within(region).getByRole("button", { name: "Move photo 1 later" }))
    await waitFor(() => expect(bodiesOf(fetch, "PUT")).toEqual([{ imageIds: ids([2, 1, 3, 4, 5, 6, 7, 8, 9]) }]))
    expect(await screen.findByText("Photo 1 is now photo 2.")).toBeInTheDocument()
  })

  it("makes a photo the cover, and moves the focus on when its own button is now off", async () => {
    const fetch = renderPhotos()
    const region = await opened()
    await userEvent.setup().click(within(region).getByRole("button", { name: "Make photo 4 the cover" }))
    await waitFor(() => expect(bodiesOf(fetch, "PUT")).toEqual([{ imageIds: ids([4, 1, 2, 3, 5, 6, 7, 8, 9]) }]))
    expect(await screen.findByText("Photo 4 is now the cover.")).toBeInTheDocument()
    expect(within(region).getByRole("button", { name: "Move photo 1 later" })).toHaveFocus()
  })

  it("works from the keyboard", async () => {
    const fetch = renderPhotos()
    const region = await opened()
    within(region).getByRole("button", { name: "Move photo 2 later" }).focus()
    await userEvent.setup().keyboard("{Enter}")
    await waitFor(() => expect(bodiesOf(fetch, "PUT")).toEqual([{ imageIds: ids([1, 3, 2, 4, 5, 6, 7, 8, 9]) }]))
  })

  it("ignores a second move while the first is being saved", async () => {
    let release = () => {}
    const held = new Promise<undefined>((resolve) => (release = () => resolve(undefined)))
    const fetch = renderPhotos((method) => (method === "PUT" ? held : undefined))
    const region = await opened()
    const user = userEvent.setup()
    await user.click(within(region).getByRole("button", { name: "Move photo 3 earlier" }))
    await user.click(within(region).getByRole("button", { name: "Move photo 5 earlier" }))
    release()
    expect(await screen.findByText("Photo 3 is now photo 2.")).toBeInTheDocument()
    expect(bodiesOf(fetch, "PUT")).toHaveLength(1)
  })

  it("reloads the order when the server says the photos changed", async () => {
    const fetch = renderPhotos((method) => (method === "PUT" ? failure(400, "VALIDATION", "Send every photo of this piece exactly once.") : undefined))
    const region = await opened()
    const gets = () => callsOf(fetch).filter((call) => call === "GET /admin/products/5").length
    const before = gets()
    await userEvent.setup().click(within(region).getByRole("button", { name: "Move photo 2 earlier" }))
    expect(await screen.findByText(p.changed)).toBeInTheDocument()
    expect(gets()).toBe(before + 1)
  })

  it("keeps the order and says so when the move doesn't reach the API", async () => {
    renderPhotos((method) => (method === "PUT" ? new Response("Bad gateway", { status: 502 }) : undefined))
    const region = await opened()
    await userEvent.setup().click(within(region).getByRole("button", { name: "Move photo 2 earlier" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(p.orderFailed)
    expect(altTexts(region)[1]).toBe("Photo 2 of 9, Hover")
  })
})

describe("deleting a photo", () => {
  it("asks inside the page, then deletes it and closes up the order", async () => {
    const confirmSpy = vi.spyOn(window, "confirm")
    const fetch = renderPhotos()
    const region = await opened()
    const user = userEvent.setup()
    await user.click(within(region).getByRole("button", { name: "Delete photo 2" }))
    const dialog = await screen.findByRole("alertdialog", { name: "Delete photo 2?" })
    expect(dialog).toHaveTextContent(p.confirmText)
    await user.click(within(dialog).getByRole("button", { name: p.keep }))
    expect(callsOf(fetch).some((call) => call.startsWith("DELETE"))).toBe(false)

    await user.click(within(region).getByRole("button", { name: "Delete photo 2" }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: p.confirmDelete }))
    await waitFor(() => expect(callsOf(fetch)).toContain("DELETE /admin/products/5/photos/502"))
    expect(await screen.findByText("Photo 2 deleted.")).toBeInTheDocument()
    const alts = altTexts(region)
    expect(alts).toHaveLength(8)
    expect(alts[1]).toBe("Photo 2 of 8, Hover")
    expect(within(region).getAllByRole("img")[1]).toHaveAttribute("src", `${QADISHA.images[2].url}/480.webp`)
    expect(within(region).getByRole("button", { name: "Delete photo 2" })).toHaveFocus()
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it("shows the server's message when the photo is already gone, with the latest photos", async () => {
    renderPhotos((method) => (method === "DELETE" ? failure(404, "NOT_FOUND", "Photo not found") : undefined))
    const region = await opened()
    const user = userEvent.setup()
    await user.click(within(region).getByRole("button", { name: "Delete photo 2" }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: p.confirmDelete }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Photo not found")
  })
})

describe("leaving and the session", () => {
  it("asks before leaving while photos are being added", async () => {
    let release = () => {}
    const held = new Promise<undefined>((resolve) => (release = () => resolve(undefined)))
    renderPhotos((_method, path) => (path === STORAGE_URL ? held : undefined))
    await opened()
    const user = userEvent.setup()
    await user.upload(screen.getByLabelText(p.add), [fileOf("a.jpg"), fileOf("b.jpg")])
    await screen.findByText("Adding photo 1 of 2…")
    await user.click(screen.getByRole("link", { name: `← ${f.back}` }))
    const dialog = await screen.findByRole("alertdialog", { name: STUDIO_COPY.leave.uploadingTitle })
    expect(dialog).toHaveTextContent(STUDIO_COPY.leave.uploadingText)
    await user.click(within(dialog).getByRole("button", { name: STUDIO_COPY.leave.leave }))
    expect(await landedOn("/studio/products")).toBeInTheDocument()
    release()
  })

  it("after a 401 mid-batch, asks to sign in again, then names the photos not added", async () => {
    let slots = 0
    let expired = true
    stubAdminApi([QADISHA], (_method, path) => (expired && path.endsWith("/photos/upload") && ++slots === 2 ? unauthorized() : undefined))
    const Stub = createRoutesStub([
      { path: "/studio/sign-in", Component: StudioSignIn },
      {
        Component: () => (
          <RequireAdmin>
            <Outlet />
          </RequireAdmin>
        ),
        children: [{ path: "/studio/products/:id", Component: StudioProductEdit }],
      },
    ])
    render(
      <AdminAuthProvider client={fakeAdminAuth({ signedInAs: "omar@example.com" })} apiBase="https://api.test">
        <Stub initialEntries={["/studio/products/5"]} />
      </AdminAuthProvider>,
    )
    await opened()
    const user = userEvent.setup()
    await user.upload(screen.getByLabelText(p.add), [fileOf("a.jpg"), fileOf("b.jpg"), fileOf("c.jpg")])

    await screen.findByRole("heading", { level: 1, name: STUDIO_COPY.signIn.title })
    expect(screen.getByText(p.signInAgain)).toBeInTheDocument()
    expect(readPendingPhotos(5)).toEqual(["b.jpg", "c.jpg"])

    expired = false
    await user.type(screen.getByLabelText(STUDIO_COPY.email), "omar@example.com")
    await user.type(screen.getByLabelText(STUDIO_COPY.password), "Correct-Horse-9")
    await user.click(screen.getByRole("button", { name: STUDIO_COPY.signIn.submit }))
    const region = await opened()
    expect(screen.getByText("These photos weren't added: b.jpg, c.jpg. Add them again.")).toBeInTheDocument()
    // a.jpg made it before the session ended.
    expect(altTexts(region)).toHaveLength(10)
    await waitFor(() => expect(readPendingPhotos(5)).toBeNull())
  })
})
