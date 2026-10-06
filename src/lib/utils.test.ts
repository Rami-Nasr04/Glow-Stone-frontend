import { cn } from "./utils"

// Our theme defines its own type scale and letter-spacing tokens; class merging must know them,
// otherwise text-label looks like a colour and is dropped when a text colour follows.
describe("cn", () => {
  it("keeps a custom text size next to a text colour", () => {
    expect(cn("text-label uppercase", "text-muted-foreground")).toBe("text-label uppercase text-muted-foreground")
    expect(cn("text-small text-pretty text-muted-foreground")).toBe("text-small text-pretty text-muted-foreground")
    expect(cn("font-display text-display-hero", "text-on-photo")).toBe("font-display text-display-hero text-on-photo")
  })

  it("still lets a later size or tracking win over an earlier one", () => {
    expect(cn("text-label", "text-xs")).toBe("text-xs")
    expect(cn("text-lead", "text-quote")).toBe("text-quote")
    expect(cn("tracking-label", "tracking-caps")).toBe("tracking-caps")
  })
})
