import { render, screen } from "@testing-library/react"
import { createRoutesStub, type MetaDescriptor } from "react-router"
import { PRODUCTS, productOf, stubApi } from "@/test/catalog"
import { clientLoader as aboutClientLoader, loader as aboutLoader } from "./about"
import { clientLoader as collectionClientLoader, loader as collectionLoader, meta as collectionMeta } from "./collection"
import { clientLoader as homeClientLoader, loader as homeLoader, meta as homeMeta } from "./home"
import { clientLoader, ErrorBoundary, loader as productLoader, meta as productMeta } from "./product"
import type { Route } from "./+types/product"

// With ssr:false these loaders run only while the site is built; their data is written into each page.
const args = <T,>(params: Record<string, string> = {}) => ({ params, request: new Request("https://site.test/") }) as unknown as T
const productArgs = (id: string) => args<Route.LoaderArgs>({ id })
// The structured data a page's meta carries, if any.
const ldJson = (tags: MetaDescriptor[]) => tags.flatMap((tag) => ("script:ld+json" in tag ? [tag["script:ld+json"]] : []))[0]

describe("route loaders", () => {
  beforeEach(() => vi.stubEnv("VITE_API_URL", "https://api.test"))
  afterEach(() => vi.unstubAllEnvs())

  it("home: every published piece, and nothing else from the API", async () => {
    const fetch = stubApi()
    expect(await homeLoader()).toEqual({ products: PRODUCTS })
    expect(fetch.mock.calls.map(([input]) => new URL(String(input)).pathname)).toEqual(["/products"])
  })

  // The hero and the spotlight are fixed Qadisha content (Rami, 2026-10-15): the home page builds whatever its state.
  it.each([
    ["a draft", PRODUCTS.filter((p) => p.id !== 5)],
    ["sold out", PRODUCTS.map((p) => (p.id === 5 ? { ...p, remaining: 0, soldOut: true } : p))],
  ])("home: builds when Qadisha is %s", async (_state, products) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: products }))))
    expect(await homeLoader()).toEqual({ products })
  })

  it("stops the build on a bad answer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: [] }))))
    await expect(collectionLoader()).rejects.toThrow("GET /products: no published products")
    await expect(homeLoader()).rejects.toThrow("GET /products: no published products")
  })

  it("collection: every published piece, newest first", async () => {
    stubApi()
    expect((await collectionLoader()).products.map((p) => p.id)).toEqual([6, 5, 4, 3, 2, 1])
  })

  it("about: the name of the piece in the crest photo, or null when it is not published", async () => {
    const fetch = stubApi()
    expect(await aboutLoader()).toEqual({ crestName: "Arz" })
    fetch.mockImplementation(async () => new Response(JSON.stringify({ success: true, data: PRODUCTS.filter((p) => p.id !== 1) })))
    expect(await aboutLoader()).toEqual({ crestName: null })
  })

  it("product: the piece with all its photos, and the list for related pieces", async () => {
    stubApi()
    const data = await productLoader(productArgs("4"))
    expect(data.piece?.images).toHaveLength(19)
    expect(data.products).toEqual(PRODUCTS)
  })

  it("product: no piece for an unknown id, and no request for an id that is not a number", async () => {
    const fetch = stubApi()
    expect((await productLoader(productArgs("99"))).piece).toBeNull()
    fetch.mockClear()
    expect(await productLoader(productArgs("abc"))).toEqual({ piece: null, products: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("product in the browser: the built data when the page was built, else the live API (a piece published since)", async () => {
    const fetch = stubApi()
    const built = { piece: productOf(5), products: PRODUCTS }
    const serverLoader = vi.fn().mockResolvedValue(built)
    expect(await clientLoader({ ...productArgs("5"), serverLoader } as unknown as Route.ClientLoaderArgs)).toBe(built)
    expect(fetch).not.toHaveBeenCalled()

    serverLoader.mockRejectedValue(new Error("not prerendered"))
    const live = await clientLoader({ ...productArgs("3"), serverLoader } as unknown as Route.ClientLoaderArgs)
    expect(live?.piece?.name).toBe("Batroun")
    expect(fetch).toHaveBeenCalledWith("https://api.test/products/3", expect.anything())
  })

  // A host that answers with another page's HTML (vite preview without a trailing slash) leaves a route with no built
  // data: every page then asks the API itself instead of failing.
  it.each([
    ["home", homeClientLoader, ["products"]],
    ["collection", collectionClientLoader, ["products"]],
    ["about", aboutClientLoader, ["crestName"]],
  ] as const)("%s in the browser: the built data, else the live API", async (_, clientLoader, keys) => {
    const fetch = stubApi()
    const built = { built: true }
    const serverLoader = vi.fn().mockResolvedValue(built)
    const call = () => (clientLoader as (a: unknown) => Promise<unknown>)({ ...args<object>({}), serverLoader })
    expect(await call()).toBe(built)
    expect(fetch).not.toHaveBeenCalled()
    serverLoader.mockRejectedValue(new Error("no built data"))
    expect(Object.keys((await call()) as object).sort()).toEqual([...keys].sort())
    expect(fetch).toHaveBeenCalled()
  })

  // ":lang?" takes any first segment (/studio, /nothing-here): the layout shows the missing page there, so the
  // route asks the API nothing and a failed call can't turn the 404 into an error.
  it.each([
    ["home", homeClientLoader],
    ["collection", collectionClientLoader],
    ["about", aboutClientLoader],
    ["product", clientLoader],
  ] as const)("%s in the browser: nothing to load under an unknown first segment", async (_, load) => {
    const fetch = stubApi()
    const serverLoader = vi.fn().mockRejectedValue(new Error("no built data"))
    const call = load as (a: unknown) => Promise<unknown>
    expect(await call({ ...args<object>({ lang: "studio", id: "5" }), serverLoader })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("product meta: the piece's title, summary, cover and current address", () => {
    const piece = productOf(5)
    const tags = productMeta({ params: { id: "5", name: "old-name" }, loaderData: { piece, products: PRODUCTS } } as unknown as Route.MetaArgs)
    expect(tags).toContainEqual({ title: "Qadisha — Glowstone" })
    expect(tags).toContainEqual({
      name: "description",
      content: "Qadisha: a hand-carved limestone wine rack for 14 bottles, made in Lebanon. Tall slab with edge notches and central holes.",
    })
    expect(tags).toContainEqual({ property: "og:image", content: `${piece.images[0].url}/1440.webp` })
    expect(tags).toContainEqual(expect.objectContaining({ rel: "canonical", href: expect.stringMatching(/\/collection\/5\/qadisha$/) }))
  })

  it("product meta: the piece's Product data for search engines, at its current address", () => {
    const piece = productOf(5)
    const tags = productMeta({ params: { id: "5", name: "old-name" }, loaderData: { piece, products: PRODUCTS } } as unknown as Route.MetaArgs)
    const data = ldJson(tags) as { "@type": string; url: string }
    expect(data["@type"]).toBe("Product")
    expect(data.url).toMatch(/\/collection\/5\/qadisha$/)
  })

  it("home meta: the store's data for search engines, and a description that says what is sold and where", () => {
    const tags = homeMeta({ params: {} } as unknown as Parameters<typeof homeMeta>[0])
    expect(ldJson(tags)).toMatchObject({ "@type": "OnlineStore", name: "Glowstone" })
    const description = tags.find((tag) => "name" in tag && tag.name === "description") as { content: string }
    expect(description.content).toMatch(/wine rack/i)
    expect(description.content).toMatch(/limestone/i)
    expect(description.content).toMatch(/Lebanon/)
  })

  it("collection meta: a description that says what is sold and where", () => {
    const tags = collectionMeta({ params: {} } as unknown as Parameters<typeof collectionMeta>[0])
    const description = tags.find((tag) => "name" in tag && tag.name === "description") as { content: string }
    expect(description.content).toMatch(/wine rack/i)
    expect(description.content).toMatch(/limestone/i)
    expect(description.content).toMatch(/Lebanon/)
  })

  it("product meta: the hero for a piece without photos, and noindex for a missing piece", () => {
    const piece = { ...productOf(5), images: [] }
    const withoutPhotos = productMeta({ params: { id: "5" }, loaderData: { piece, products: [] } } as unknown as Route.MetaArgs)
    expect(withoutPhotos).toContainEqual({ property: "og:image", content: expect.stringContaining("/images/hero/desktop-1376.webp") })
    const missing = productMeta({ params: { id: "99" }, loaderData: { piece: null, products: [] } } as unknown as Route.MetaArgs)
    expect(missing).toContainEqual({ name: "robots", content: "noindex" })
  })

  it("product: a calm message, not a crash, when a page that wasn't built can't reach the API", async () => {
    const Stub = createRoutesStub([{ path: "/", Component: ErrorBoundary as React.ComponentType }])
    render(<Stub />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This piece couldn't be loaded.")
    expect(screen.getByRole("link", { name: "View the collection" })).toHaveAttribute("href", "/collection")
  })
})
