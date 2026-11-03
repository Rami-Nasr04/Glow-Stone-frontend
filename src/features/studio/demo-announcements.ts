import type { Announcement } from "./announcements.ts"
import { DemoRefusal } from "./demo-products.ts"

// Stand-in for the newsletter routes on `npm run dev:demo` (contract "Announcements", 2026-11-03): three made-up
// subscribers, the backend's checks and words, and a send kept in this browser. Nothing is ever emailed.

export const STUDIO_DEMO_ANNOUNCEMENTS_KEY = "glowstone.studio-demo.announcements"
export const DEMO_SUBSCRIBERS = 3
/** What the demo's test answers instead of an inbox. */
export const DEMO_TEST_SENT_TO = "your inbox (demo: nothing was sent)"

export const DEMO_ANNOUNCEMENT_WORDS = {
  subject: "Please write a subject (up to 150 characters).",
  message: "Please write a message (up to 5000 characters).",
  piece: "Choose a published piece to feature, or none.",
} as const

interface Store {
  announcements: Announcement[]
  /** requestId → the announcement it sent, so a repeat sends nothing. */
  requests: Record<string, number>
}

const seed = (): Store => ({
  announcements: [
    {
      id: 1,
      subject: "Two new pieces in granite",
      message: "Atera and Arz are ready, each in a small edition.\n\nThey're on the website now.",
      productId: 6,
      recipients: 2,
      sentAt: "2026-10-28T09:30:00.000Z",
    },
  ],
  requests: {},
})

interface DemoAnnouncementsOptions {
  storage: Storage | null
  /** The ids of the published pieces, in Omar's order. */
  published: () => Promise<number[]>
  /** How long a send takes here (the real one takes up to ~30 s). */
  sendDelayMs: number
}

export function createDemoAnnouncements({ storage, published, sendDelayMs }: DemoAnnouncementsOptions) {
  let memory: Store | null = null
  const load = (): Store => {
    const saved = storage?.getItem(STUDIO_DEMO_ANNOUNCEMENTS_KEY)
    if (saved) {
      try {
        return JSON.parse(saved) as Store
      } catch {
        // A broken store starts again from the seed.
      }
    }
    return memory ?? seed()
  }
  const save = (store: Store) => {
    memory = store
    storage?.setItem(STUDIO_DEMO_ANNOUNCEMENTS_KEY, JSON.stringify(store))
  }

  async function draftOf(body: unknown): Promise<{ subject: string; message: string; productId: number | null }> {
    const fields = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
    const subject = typeof fields.subject === "string" ? fields.subject.trim() : ""
    const message = typeof fields.message === "string" ? fields.message.trim() : ""
    if (subject.length < 1 || subject.length > 150) throw new DemoRefusal(400, "VALIDATION", DEMO_ANNOUNCEMENT_WORDS.subject)
    if (message.length < 1 || message.length > 5000) throw new DemoRefusal(400, "VALIDATION", DEMO_ANNOUNCEMENT_WORDS.message)
    const productId = fields.productId ?? null
    if (productId !== null && (typeof productId !== "number" || !(await published()).includes(productId))) {
      throw new DemoRefusal(400, "VALIDATION", DEMO_ANNOUNCEMENT_WORDS.piece)
    }
    return { subject, message, productId }
  }

  /** "/admin/announcements[/test]"; null for any other path. */
  async function answer(method: string, path: string, body: unknown): Promise<{ status: number; data: unknown } | null> {
    if (path === "/admin/announcements" && method === "GET") {
      const { announcements } = load()
      return { status: 200, data: { subscribers: DEMO_SUBSCRIBERS, announcements } }
    }
    if (path === "/admin/announcements/test" && method === "POST") {
      await draftOf(body)
      return { status: 200, data: { sentTo: DEMO_TEST_SENT_TO } }
    }
    if (path === "/admin/announcements" && method === "POST") {
      const requestId = typeof body === "object" && body !== null ? (body as { requestId?: unknown }).requestId : undefined
      if (typeof requestId !== "string" || requestId === "") throw new DemoRefusal(400, "VALIDATION", "requestId is required")
      const store = load()
      const earlier = store.announcements.find((a) => a.id === store.requests[requestId])
      if (earlier) return { status: 201, data: earlier }
      const draft = await draftOf(body)
      await new Promise((done) => setTimeout(done, sendDelayMs))
      const sent: Announcement = {
        id: Math.max(0, ...store.announcements.map((a) => a.id)) + 1,
        ...draft,
        recipients: DEMO_SUBSCRIBERS,
        sentAt: new Date().toISOString(),
      }
      save({ announcements: [sent, ...store.announcements], requests: { ...store.requests, [requestId]: sent.id } })
      return { status: 201, data: sent }
    }
    return null
  }

  return { answer }
}
