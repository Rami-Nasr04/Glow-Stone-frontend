import { clearAllDrafts, clearDraft, readDraft, registerOpenDraft, saveDraft, stashOpenDrafts } from "./drafts"
import { EMPTY_FORM, type ProductFormValues } from "./product-form"

const draft: ProductFormValues = { ...EMPTY_FORM, name: "Qadisha", price: "1200", featured: true }

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe("studio drafts", () => {
  it("keeps a form draft in this tab's session storage, by piece id or new", () => {
    saveDraft(5, draft)
    saveDraft("new", { ...draft, name: "Fresh" })
    expect(Object.keys(sessionStorage)).toEqual(expect.arrayContaining(["glowstone.studio.draft:5", "glowstone.studio.draft:new"]))
    expect(localStorage.length).toBe(0)
    expect(readDraft(5)).toEqual(draft)
    expect(readDraft("new")?.name).toBe("Fresh")
    expect(readDraft(6)).toBeNull()
  })

  it("stores only the form's own fields", () => {
    saveDraft(5, { ...draft, password: "Secret-1", accessToken: "eyJ" } as unknown as ProductFormValues)
    const raw = sessionStorage.getItem("glowstone.studio.draft:5") ?? ""
    expect(raw).not.toMatch(/Secret|eyJ|password|token/i)
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(Object.keys(EMPTY_FORM).sort())
  })

  it("ignores and removes a draft that isn't a form any more", () => {
    sessionStorage.setItem("glowstone.studio.draft:5", "{broken")
    expect(readDraft(5)).toBeNull()
    sessionStorage.setItem("glowstone.studio.draft:5", JSON.stringify({ name: 5 }))
    expect(readDraft(5)).toBeNull()
    expect(sessionStorage.getItem("glowstone.studio.draft:5")).toBeNull()
  })

  it("clears one draft, or all of them, leaving other keys alone", () => {
    saveDraft(5, draft)
    saveDraft("new", draft)
    sessionStorage.setItem("other", "kept")
    clearDraft(5)
    expect(readDraft(5)).toBeNull()
    expect(readDraft("new")).not.toBeNull()
    clearAllDrafts()
    expect(readDraft("new")).toBeNull()
    expect(sessionStorage.getItem("other")).toBe("kept")
  })

  it("stashes the open forms that have unsaved changes when the session ends", () => {
    let values = draft
    const unregister = registerOpenDraft(() => ({ key: 5, values }))
    const clean = registerOpenDraft(() => null)
    values = { ...draft, name: "Changed" }
    stashOpenDrafts()
    expect(readDraft(5)?.name).toBe("Changed")
    unregister()
    clean()
    clearAllDrafts()
    stashOpenDrafts()
    expect(readDraft(5)).toBeNull()
  })

  it("works without storage (a private window that refuses it)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    expect(() => saveDraft(5, draft)).not.toThrow()
    spy.mockRestore()
  })
})
