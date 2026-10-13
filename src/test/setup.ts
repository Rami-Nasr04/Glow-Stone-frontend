import "@testing-library/jest-dom/vitest"

// jsdom has no matchMedia; sonner and the motion components read it.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// No test reaches the real API: pages refresh their stock on load, so fetch fails unless a test stubs it.
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("fetch is not stubbed in this test"))))
})
afterEach(() => {
  vi.unstubAllGlobals()
})
