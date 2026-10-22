import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderAt } from "@/test/render"
import NewsSignup from "./NewsSignup"

const json = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status })

function answerWith(reply: () => Promise<Response>) {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(reply)
  vi.stubGlobal("fetch", fetch)
  return fetch
}

function setup(tone: "dark" | "light" = "light") {
  const user = userEvent.setup()
  renderAt(<NewsSignup id="news" tone={tone} />)
  return { user, field: screen.getByLabelText("Email") }
}

const sent = (fetch: ReturnType<typeof answerWith>) => fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))

describe("NewsSignup", () => {
  it("adds the email to the list, asking to rejoin, and thanks the visitor", async () => {
    let answer!: (r: Response) => void
    const fetch = answerWith(() => new Promise((resolve) => (answer = resolve)))
    const { user, field } = setup()
    await user.type(field, "  sara@example.com ")
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    const button = screen.getByRole("button", { name: "Sending…" })
    expect(button).toBeDisabled()
    expect(sent(fetch)).toEqual([{ email: "sara@example.com", rejoin: true, website: "" }])
    expect(String(fetch.mock.calls[0][0])).toBe("https://api.test/subscribers")

    answer(json(204))
    const thanks = await screen.findByText("Thank you. You'll hear about new editions.")
    expect(thanks.closest("[role=status]")).not.toBeNull()
    // Focus moves in an effect after the thanks is drawn.
    await waitFor(() => expect(thanks).toHaveFocus())
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("sends once, however often the button is pressed while sending", async () => {
    const fetch = answerWith(() => new Promise(() => {}))
    const { user, field } = setup()
    await user.type(field, "sara@example.com")
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    await user.click(screen.getByRole("button", { name: "Sending…" }))
    await user.type(field, "{Enter}")
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("checks the address before sending anything", async () => {
    const fetch = answerWith(() => Promise.resolve(json(204)))
    const { user, field } = setup()
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    expect(screen.getByText("Please enter a valid email.")).toBeInTheDocument()
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field).toHaveFocus()
    await user.type(field, "sara@example")
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows the API's message under the field on a 400", async () => {
    // The server's words, whatever they are (here not the browser's own check).
    answerWith(() => Promise.resolve(json(400, { success: false, error: { code: "VALIDATION", message: "Email must be at most 254 characters." } })))
    const { user, field } = setup()
    await user.type(field, "sara@example.com")
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    const message = await screen.findByText("Email must be at most 254 characters.")
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field.getAttribute("aria-describedby")).toBe(message.id)
    expect(field).toHaveValue("sara@example.com")
    expect(screen.getByRole("button", { name: "Notify me" })).toBeEnabled()
  })

  it.each([
    ["429", () => Promise.resolve(json(429, { message: "Too Many Requests" })), "Please try again in a minute."],
    ["a network error", () => Promise.reject(new TypeError("Failed to fetch")), "Something went wrong. Please try again."],
    ["a server error", () => Promise.resolve(json(500)), "Something went wrong. Please try again."],
  ])("on %s, says so and keeps the address to try again", async (_, reply, text) => {
    answerWith(reply)
    const { user, field } = setup()
    await user.type(field, "sara@example.com")
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(text)
    expect(field).not.toHaveAttribute("aria-invalid")
    expect(field).toHaveValue("sara@example.com")
    expect(screen.getByRole("button", { name: "Notify me" })).toBeEnabled()
  })

  it("clears an old message when the visitor tries again", async () => {
    const fetch = answerWith(() => Promise.resolve(json(429, { message: "Too Many Requests" })))
    const { user, field } = setup()
    await user.type(field, "sara@example.com")
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    await screen.findByRole("alert")
    fetch.mockImplementation(() => Promise.resolve(json(204)))
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
    expect(await screen.findByText("Thank you. You'll hear about new editions.")).toBeInTheDocument()
  })

  it("on charcoal, hides the label behind the placeholder and says Subscribe", () => {
    renderAt(<NewsSignup id="footer-news" tone="dark" />)
    const field = screen.getByLabelText("Your email, for new editions")
    expect(field).toHaveAttribute("placeholder", "Your email, for new editions")
    expect(screen.getByText("Your email, for new editions", { selector: "label" })).toHaveClass("sr-only")
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument()
  })

  it("carries the spam trap and sends what is typed in it", async () => {
    const fetch = answerWith(() => Promise.resolve(json(204)))
    const { user, field } = setup()
    const trap = document.querySelector<HTMLInputElement>('input[name="website"]')!
    expect(trap).toHaveAttribute("tabindex", "-1")
    expect(trap).toHaveAttribute("aria-hidden", "true")
    await user.type(trap, "bot")
    await user.type(field, "sara@example.com")
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    expect(sent(fetch)[0].website).toBe("bot")
  })
})
