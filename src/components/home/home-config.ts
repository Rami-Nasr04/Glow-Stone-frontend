// The piece in the hero photo and in the home spotlight (its copy is m.home.spotlightText): Batroun, by its
// provisional id until the database gives it its real one.
export const HOME_PIECE = 3

// The spotlight's desktop pair: a landscape close-up, with the full piece framed over its corner.
// Either falls back to the cover if the piece no longer has that photo.
export const SPOTLIGHT_PHOTOS = { detail: "products/batroun/4", full: "products/batroun/3" }

// Portrait art (hero-mobile) on phones and on portrait tablets up to 1024px; also the `upright:` variant in index.css.
export const HERO_PORTRAIT_MEDIA = "(max-width: 767px), (max-width: 1024px) and (orientation: portrait)"
