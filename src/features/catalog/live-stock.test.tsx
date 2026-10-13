import { act, render, screen } from "@testing-library/react"
import { PRODUCTS, summaryOf } from "@/test/catalog"
import { useLiveStock, withLiveStock } from "./live-stock"
import type { ProductSummary } from "./types"

function Probe({ pieces }: { pieces: ProductSummary[] }) {
  const live = useLiveStock()
  return (
    <ul>
      {pieces.map((piece) => {
        const shown = withLiveStock(piece, live)
        return <li key={piece.id}>{`${piece.name} ${shown.remaining} ${shown.soldOut ? "sold out" : "available"}`}</li>
      })}
    </ul>
  )
}

const answer = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })

describe("live stock", () => {
  beforeEach(() => vi.stubEnv("VITE_API_URL", "https://api.test"))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("takes only remaining and sold out from the live list", () => {
    const built = summaryOf(6)
    const live = new Map([[6, { remaining: 0, soldOut: true }]])
    expect(withLiveStock(built, live)).toEqual({ ...built, remaining: 0, soldOut: true })
    expect(withLiveStock(built, null)).toBe(built)
    expect(withLiveStock(summaryOf(5), live)).toEqual(summaryOf(5))
  })

  it("shows the built values first, then the live stock once GET /products answers", async () => {
    let reply!: (response: Response) => void
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (reply = resolve)))
    vi.stubGlobal("fetch", fetch)
    render(<Probe pieces={[summaryOf(6), summaryOf(5)]} />)
    expect(screen.getByText("Sannine 2 available")).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith("https://api.test/products", expect.anything())
    // Someone bought the last two Sannine, and Omar changed its price: only the stock follows.
    const live = PRODUCTS.map((p) => (p.id === 6 ? { ...p, remaining: 0, soldOut: true, price: 1 } : p))
    await act(async () => reply(answer({ success: true, data: live })))
    expect(screen.getByText("Sannine 0 sold out")).toBeInTheDocument()
    expect(screen.getByText("Qadisha 4 available")).toBeInTheDocument()
  })

  it.each([
    ["the network fails", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["the API errors", () => Promise.resolve(answer({ success: false, error: { code: "INTERNAL", message: "x" } }, 500))],
    ["the answer is malformed", () => Promise.resolve(answer({ success: true, data: [{ id: 6, remaining: "none" }] }))],
  ])("keeps the built values when %s", async (_, reply) => {
    vi.stubGlobal("fetch", vi.fn(reply))
    render(<Probe pieces={[summaryOf(6)]} />)
    await act(async () => {})
    expect(screen.getByText("Sannine 2 available")).toBeInTheDocument()
  })

  it("keeps the built values when the API address is missing", async () => {
    vi.stubEnv("VITE_API_URL", "")
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    render(<Probe pieces={[summaryOf(6)]} />)
    await act(async () => {})
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByText("Sannine 2 available")).toBeInTheDocument()
  })

  it("stops listening when the page is left", () => {
    const fetch = vi.fn((_: string, init: RequestInit) => new Promise<Response>(() => init))
    vi.stubGlobal("fetch", fetch)
    const { unmount } = render(<Probe pieces={[summaryOf(6)]} />)
    const signal = (fetch.mock.calls[0][1] as RequestInit).signal!
    unmount()
    expect(signal.aborted).toBe(true)
  })
})
