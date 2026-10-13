// The piece in the hero photo and in the home spotlight: Qadisha (id 5 in the database). Its text, alt and
// placard are built from its row, so they follow the data. The build stops if it isn't published (routes/home.tsx);
// before the studio can unpublish pieces this becomes Omar's setting, or the studio refuses to unpublish it.
export const HOME_PIECE = 5

// Portrait art (hero-mobile) on phones and on portrait tablets up to 1024px; also the `upright:` variant in index.css.
export const HERO_PORTRAIT_MEDIA = "(max-width: 767px), (max-width: 1024px) and (orientation: portrait)"
