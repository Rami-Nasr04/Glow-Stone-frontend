// Programmatic scrolls glide, unless the visitor asked for reduced motion.
export function scrollBehavior(): ScrollBehavior {
  const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  return reduce ? "auto" : "smooth"
}
