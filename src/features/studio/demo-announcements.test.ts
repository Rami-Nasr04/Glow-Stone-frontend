import { createAdminApi, type AdminApi, StudioError } from "./admin-api"
import { DEMO_ANNOUNCEMENT_WORDS, DEMO_SUBSCRIBERS, DEMO_TEST_SENT_TO } from "./demo-announcements"
import { createStudioDemoFetch } from "./demo-orders"

const BASE = "https://api.test"

function setup(): AdminApi {
  return createAdminApi({
    baseUrl: BASE,
    accessToken: async () => "access-1",
    onUnauthorized: vi.fn(),
    fetch: createStudioDemoFetch({ storage: window.localStorage, sendDelayMs: 0 }),
  })
}

async function caught(promise: Promise<unknown>): Promise<StudioError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof StudioError) return error
    throw error
  }
  throw new Error("expected a StudioError")
}

const draft = { subject: "A new edition", message: "Hello.\n\nTura is back.", productId: 5 }

// On npm run dev:demo the newsletter answers in this browser: three made-up subscribers, and nothing is ever emailed.
describe("the studio's demo announcements (npm run dev:demo)", () => {
  let network: ReturnType<typeof vi.fn>
  beforeEach(() => {
    window.localStorage.clear()
    network = vi.fn(async () => new Response("{}"))
    vi.stubGlobal("fetch", network)
  })
  afterEach(() => expect(network).not.toHaveBeenCalled())

  it("starts with three subscribers and one earlier announcement", async () => {
    const list = await setup().listAnnouncements()
    expect(list.subscribers).toBe(DEMO_SUBSCRIBERS)
    expect(DEMO_SUBSCRIBERS).toBe(3)
    expect(list.announcements).toHaveLength(1)
  })

  it("answers a test without recording it", async () => {
    const api = setup()
    expect(await api.sendTestAnnouncement(draft)).toBe(DEMO_TEST_SENT_TO)
    expect((await api.listAnnouncements()).announcements).toHaveLength(1)
  })

  it("records a send to every subscriber, newest first, and answers a repeat of the same request with the first send", async () => {
    const api = setup()
    const first = await api.sendAnnouncement("req-1", draft)
    expect(first).toMatchObject({ subject: "A new edition", productId: 5, recipients: 3 })
    expect(await api.sendAnnouncement("req-1", { ...draft, subject: "Changed" })).toEqual(first)
    const list = await api.listAnnouncements()
    expect(list.announcements).toHaveLength(2)
    expect(list.announcements[0]).toEqual(first)
    await api.sendAnnouncement("req-2", { ...draft, productId: null })
    expect((await api.listAnnouncements()).announcements).toHaveLength(3)
  })

  it.each([
    [{ ...draft, subject: "   " }, DEMO_ANNOUNCEMENT_WORDS.subject],
    [{ ...draft, subject: "x".repeat(151) }, DEMO_ANNOUNCEMENT_WORDS.subject],
    [{ ...draft, message: "" }, DEMO_ANNOUNCEMENT_WORDS.message],
    [{ ...draft, message: "x".repeat(5001) }, DEMO_ANNOUNCEMENT_WORDS.message],
    [{ ...draft, productId: 999 }, DEMO_ANNOUNCEMENT_WORDS.piece],
  ])("refuses a draft the API would refuse, in its words", async (bad, message) => {
    const api = setup()
    expect(await caught(api.sendTestAnnouncement(bad))).toMatchObject({ status: 400, code: "VALIDATION", message })
    expect(await caught(api.sendAnnouncement("req-3", bad))).toMatchObject({ status: 400, message })
    expect((await api.listAnnouncements()).announcements).toHaveLength(1)
  })
})
