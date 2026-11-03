import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { en } from "@/i18n/messages/en"
import { renderAt } from "@/test/render"
import Unsubscribe from "./Unsubscribe"

const u = en.unsubscribe
const answer = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status })

// The email's unsubscribe link (contract "Announcements", 2026-11-03).
describe("the unsubscribe page", () => {
  it("takes the person off the list on load, and offers a quiet way back that rejoins", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => answer(204))
    vi.stubGlobal("fetch", fetch)
    renderAt(<Unsubscribe />, "/unsubscribe?t=tok-123")
    expect(await screen.findByRole("heading", { level: 1, name: u.doneTitle })).toBeInTheDocument()
    expect(screen.getByText(u.doneLead)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe("https://api.test/subscribers/unsubscribe?t=tok-123")
    await userEvent.click(screen.getByRole("button", { name: u.joinAgain }))
    // The button is replaced by the sign-up: focus goes to its field, not back to the top of the page.
    expect(screen.getByLabelText(en.news.email)).toHaveFocus()
    await userEvent.type(screen.getByLabelText(en.news.email), "sara@example.com")
    await userEvent.click(screen.getByRole("button", { name: en.news.notifyMe }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toMatchObject({ email: "sara@example.com", rejoin: true })
  })

  it("shows the API's message for a link it can't read", async () => {
    const message = "This unsubscribe link isn't valid. Write to hello@glowstonelb.com and we'll take you off the list."
    vi.stubGlobal("fetch", vi.fn(async () => answer(400, { success: false, error: { code: "VALIDATION", message } })))
    renderAt(<Unsubscribe />, "/unsubscribe?t=bad")
    expect(await screen.findByRole("heading", { level: 1, name: u.invalidTitle })).toBeInTheDocument()
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it("says the link isn't valid without asking the API when there is no token", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    renderAt(<Unsubscribe />, "/unsubscribe")
    expect(await screen.findByRole("heading", { level: 1, name: u.invalidTitle })).toBeInTheDocument()
    expect(screen.getByText(u.invalid)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("says when the list couldn't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    renderAt(<Unsubscribe />, "/unsubscribe?t=tok")
    expect(await screen.findByText(u.failed)).toBeInTheDocument()
  })
})
