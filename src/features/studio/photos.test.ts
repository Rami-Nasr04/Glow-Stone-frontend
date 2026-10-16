import type { AdminProductImage } from "@/features/catalog/types"
import { adminProductOf, failure, ok, unauthorized } from "@/test/studio"
import { createAdminApi, StudioError } from "./admin-api"
import { addPhoto, addPhotos, checkPhoto, MAX_PHOTO_BYTES, PHOTO_MESSAGES, prewarm, sendToStorage } from "./photos"

const BASE = "https://api.test"
const STORAGE = "https://uploads.test/"
const slot = (n = 1) => ({
  uploadId: `upload-${n}`,
  url: STORAGE,
  fields: { key: `incoming/5/upload-${n}`, policy: "cG9saWN5", "x-amz-signature": "c2ln" },
})
const photoOf = (id: number, position: number): AdminProductImage => ({
  url: `https://cdn.test/products/5/p${id}`,
  width: 2880,
  height: 4318,
  id,
  position,
})

function fileOf(name: string, { type = "image/jpeg", size = 1024 }: { type?: string; size?: number } = {}): File {
  const file = new File(["x"], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

type Route = (url: string, init: RequestInit) => Response | Promise<Response> | undefined

// The three upload calls by default: a slot per request, S3's 204, and a new photo at the end per confirm.
function setup(route: Route = () => undefined) {
  let slots = 0
  let nextId = 900
  const fetch = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input)
    const forced = await route(url, init)
    if (forced) return forced
    if (url === STORAGE) return new Response(null, { status: 204 })
    if (url.endsWith("/photos/upload")) return ok(slot(++slots))
    if (url.endsWith("/photos")) return ok(photoOf(++nextId, nextId - 890), 201)
    throw new Error(`unexpected call ${url}`)
  })
  vi.stubGlobal("fetch", fetch)
  const onUnauthorized = vi.fn()
  const api = createAdminApi({ baseUrl: BASE, accessToken: async () => "access-1", onUnauthorized })
  const calls = () => fetch.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${String(url).replace(BASE, "")}`)
  return { api, fetch, calls, onUnauthorized }
}

let warmed: string[]
beforeEach(() => {
  warmed = []
  vi.stubGlobal(
    "Image",
    class {
      set src(value: string) {
        warmed.push(value)
      }
    },
  )
})

async function caught(promise: Promise<unknown>): Promise<StudioError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof StudioError) return error
    throw error
  }
  throw new Error("expected a StudioError")
}

describe("checking a photo in the browser", () => {
  it("lets a JPEG, PNG or WebP up to 30 MB through", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(checkPhoto(fileOf("a", { type, size: MAX_PHOTO_BYTES }))).toBeNull()
  })

  it("refuses a file over 30 MB with the contract's words", () => {
    expect(MAX_PHOTO_BYTES).toBe(30 * 1024 * 1024)
    expect(checkPhoto(fileOf("big.jpg", { size: MAX_PHOTO_BYTES + 1 }))).toBe("This photo is larger than 30 MB.")
  })

  it("refuses any other type with the server's own words", () => {
    for (const type of ["image/heic", "application/pdf", ""]) {
      expect(checkPhoto(fileOf("a", { type }))).toBe("This file isn't a JPEG, PNG or WebP photo.")
    }
  })
})

describe("sending a photo to storage", () => {
  it("posts the fields first, then Content-Type, then the file last, with no Authorization header", async () => {
    const { fetch } = setup()
    const file = fileOf("IMG_0042.jpeg", { type: "image/png" })
    await sendToStorage(slot(), file)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(STORAGE)
    expect(init?.method).toBe("POST")
    expect(init?.headers).toBeUndefined()
    const body = init?.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect([...body.keys()]).toEqual(["key", "policy", "x-amz-signature", "Content-Type", "file"])
    expect(body.get("key")).toBe("incoming/5/upload-1")
    expect(body.get("Content-Type")).toBe("image/png")
    expect((body.get("file") as File).name).toBe("IMG_0042.jpeg")
  })

  it("explains a refused or failed upload in plain words", async () => {
    for (const answer of [
      () => new Response("<Error><Code>AccessDenied</Code><Message>Policy expired</Message></Error>", { status: 403 }),
      () => Promise.reject(new TypeError("Failed to fetch")),
    ]) {
      setup(answer)
      expect(await caught(sendToStorage(slot(), fileOf("a.jpg")))).toMatchObject({ code: "STORAGE", message: PHOTO_MESSAGES.storage })
    }
  })
})

describe("adding one photo", () => {
  it("makes the three calls in order, then pre-warms the five sizes", async () => {
    const { api, calls } = setup()
    const photo = await addPhoto(api, 5, fileOf("a.jpg"))
    expect(photo.id).toBe(901)
    expect(calls()).toEqual(["POST /admin/products/5/photos/upload", `POST ${STORAGE}`, "POST /admin/products/5/photos"])
    expect(warmed).toEqual([480, 960, 1440, 2048, 2880].map((w) => `${photo.url}/${w}.webp`))
  })

  it("sends the slot's upload id to the confirm", async () => {
    const { api, fetch } = setup()
    await addPhoto(api, 5, fileOf("a.jpg"))
    expect(JSON.parse(String(fetch.mock.calls[2][1]?.body))).toEqual({ uploadId: "upload-1" })
  })

  it("checks the size before any call", async () => {
    const { api, fetch } = setup()
    expect((await caught(addPhoto(api, 5, fileOf("big.jpg", { size: MAX_PHOTO_BYTES + 1 })))).message).toBe("This photo is larger than 30 MB.")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("doesn't confirm when storage refused the file", async () => {
    const { api, calls } = setup((url) => (url === STORAGE ? new Response("<Error/>", { status: 400 }) : undefined))
    await caught(addPhoto(api, 5, fileOf("a.jpg")))
    expect(calls()).toEqual(["POST /admin/products/5/photos/upload", `POST ${STORAGE}`])
    expect(warmed).toEqual([])
  })
})

function hooks(known: AdminProductImage[] = [], reloadTo?: AdminProductImage[]) {
  return {
    onProgress: vi.fn(),
    onAdded: vi.fn(),
    onReloaded: vi.fn(),
    onPending: vi.fn(),
    knownIds: () => known.map((photo) => photo.id),
    reload: vi.fn(async () => reloadTo ?? known),
    isCancelled: () => false,
  }
}

describe("adding several photos", () => {
  it("adds them one at a time, in the chosen order, saying which one is going", async () => {
    const { api, calls } = setup()
    const h = hooks()
    const result = await addPhotos(api, 5, [fileOf("a.jpg"), fileOf("b.jpg"), fileOf("c.jpg")], h)
    expect(h.onProgress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
    expect(result.added.map((photo) => photo.id)).toEqual([901, 902, 903])
    expect(h.onAdded).toHaveBeenCalledTimes(3)
    expect(result.failed).toEqual([])
    expect(calls().filter((call) => call.endsWith("/upload"))).toHaveLength(3)
    // The uploads never overlap: each confirm comes before the next slot.
    expect(calls().map((call) => call.split(" ")[1].split("/").at(-1))).toEqual(["upload", "", "photos", "upload", "", "photos", "upload", "", "photos"])
  })

  it("lists each failure with the server's message as sent, and carries on", async () => {
    let confirms = 0
    const { api } = setup((url) => {
      if (!url.endsWith("/5/photos")) return undefined
      confirms++
      if (confirms === 1) return failure(400, "VALIDATION", "This photo is too small for the website (at least 1440 px wide).")
      if (confirms === 2) return failure(400, "VALIDATION", "This file isn't a JPEG, PNG or WebP photo.")
      return undefined
    })
    const result = await addPhotos(api, 5, [fileOf("small.jpg"), fileOf("odd.png"), fileOf("big.jpg", { size: MAX_PHOTO_BYTES + 1 }), fileOf("good.jpg")], hooks())
    expect(result.failed).toEqual([
      { name: "small.jpg", message: "This photo is too small for the website (at least 1440 px wide)." },
      { name: "odd.png", message: "This file isn't a JPEG, PNG or WebP photo." },
      { name: "big.jpg", message: "This photo is larger than 30 MB." },
    ])
    expect(result.added).toHaveLength(1)
  })

  it("stops at the 30-photo limit and lists the rest with the same message, without more calls", async () => {
    const { api, calls } = setup((url) => (url.endsWith("/photos/upload") ? failure(409, "CONFLICT", "A piece can have at most 30 photos.") : undefined))
    const result = await addPhotos(api, 5, [fileOf("a.jpg"), fileOf("b.jpg"), fileOf("c.jpg")], hooks())
    expect(calls()).toEqual(["POST /admin/products/5/photos/upload"])
    expect(result.failed).toEqual(["a.jpg", "b.jpg", "c.jpg"].map((name) => ({ name, message: "A piece can have at most 30 photos." })))
  })

  it("stops on a 401: the session is over, and the photos not added are kept by name", async () => {
    let slots = 0
    // b.jpg is refused in the browser (no slot asked), so c.jpg asks for the second slot and meets the 401.
    const { api, onUnauthorized } = setup((url) => (url.endsWith("/photos/upload") && ++slots === 2 ? unauthorized() : undefined))
    const h = hooks()
    const result = await addPhotos(api, 5, [fileOf("a.jpg"), fileOf("b.jpg", { size: MAX_PHOTO_BYTES + 1 }), fileOf("c.jpg"), fileOf("d.jpg")], h)
    expect(result.unauthorized).toBe(true)
    expect(result.added.map((photo) => photo.id)).toEqual([901])
    expect(result.notTried).toEqual(["c.jpg", "d.jpg"])
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    // Kept before each photo, so it's there whenever the session ends; not cleared after a 401.
    expect(h.onPending.mock.calls.at(-1)).toEqual([["b.jpg", "c.jpg", "d.jpg"]])
  })

  it("forgets the pending names once the batch ends normally", async () => {
    const { api } = setup()
    const h = hooks()
    await addPhotos(api, 5, [fileOf("a.jpg"), fileOf("b.jpg")], h)
    expect(h.onPending.mock.calls).toEqual([[["a.jpg", "b.jpg"]], [["b.jpg"]], [[]]])
  })

  it("reloads the piece when a confirm fails, and counts the photo when the first confirm had worked", async () => {
    const before = [photoOf(501, 1)]
    const landed = photoOf(777, 2)
    const { api } = setup((url) => (url.endsWith("/5/photos") ? failure(400, "VALIDATION", "This upload wasn't found. Upload the photo again.") : undefined))
    const h = hooks(before, [...before, landed])
    const result = await addPhotos(api, 5, [fileOf("a.jpg")], h)
    expect(h.reload).toHaveBeenCalledTimes(1)
    expect(h.onReloaded).toHaveBeenCalledWith([...before, landed])
    expect(result.failed).toEqual([])
    expect(result.added).toEqual([landed])
  })

  it("shows the upload-not-found message when the reload has no new photo", async () => {
    const before = [photoOf(501, 1)]
    const { api } = setup((url) => (url.endsWith("/5/photos") ? failure(400, "VALIDATION", "This upload wasn't found. Upload the photo again.") : undefined))
    const h = hooks(before, before)
    const result = await addPhotos(api, 5, [fileOf("a.jpg")], h)
    expect(h.reload).toHaveBeenCalledTimes(1)
    expect(result.failed).toEqual([{ name: "a.jpg", message: "This upload wasn't found. Upload the photo again." }])
  })

  it("stops before the next photo once the admin has left", async () => {
    const { api, calls } = setup()
    let left = false
    const h = { ...hooks(), isCancelled: () => left, onAdded: vi.fn(() => (left = true)) }
    const result = await addPhotos(api, 5, [fileOf("a.jpg"), fileOf("b.jpg")], h)
    expect(calls().filter((call) => call.endsWith("/upload"))).toHaveLength(1)
    expect(result.notTried).toEqual(["b.jpg"])
  })
})

describe("pre-warming", () => {
  it("loads every allowed width once", () => {
    prewarm(adminProductOf(5).images[0])
    expect(warmed).toHaveLength(5)
    expect(warmed[4]).toBe(`${adminProductOf(5).images[0].url}/2880.webp`)
  })
})
