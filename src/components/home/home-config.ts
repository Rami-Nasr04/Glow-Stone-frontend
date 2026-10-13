// The piece in the hero photo and in the home spotlight: Qadisha (id 5 in the database). Its text, alt and
// placard are built from its row, so they follow the data.
export const HOME_PIECE = 5

// The spotlight's desktop pair: a landscape close-up, with the full piece framed over its corner.
// Either falls back to the cover if the piece no longer has that photo. ("batroun" is only the old folder name of
// Qadisha's photos, see features/catalog/bundled-photos.ts.)
export const SPOTLIGHT_PHOTOS = { detail: "products/batroun/4", full: "products/batroun/3" }

// Portrait art (hero-mobile) on phones and on portrait tablets up to 1024px; also the `upright:` variant in index.css.
export const HERO_PORTRAIT_MEDIA = "(max-width: 767px), (max-width: 1024px) and (orientation: portrait)"
