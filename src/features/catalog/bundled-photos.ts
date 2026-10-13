// Bundled photos per product id, until the website reads the product_images API (the backend's slice).
// The image folders keep the provisional names from F2; this is the backend's mapping to the real pieces (2026-10-13):
// 1 Arz ← sannine-sand, 2 Nahr ← byblos, 3 Batroun ← nahr, 4 Jbeil ← arz/2–5, 5 Qadisha ← batroun,
// 6 Sannine ← qadisha-earth then qadisha-ash. sannine-ash/* and arz/1 belong to no real piece and are not used.
export const BUNDLED_PHOTOS: Record<number, readonly { key: string; width: number; height: number }[]> = {
  1: [
    { key: "products/sannine-sand/1", width: 2048, height: 3072 },
    { key: "products/sannine-sand/2", width: 2048, height: 3072 },
    { key: "products/sannine-sand/3", width: 2048, height: 3072 },
    { key: "products/sannine-sand/4", width: 2048, height: 3072 },
  ],
  2: [
    { key: "products/byblos/1", width: 2048, height: 3072 },
    { key: "products/byblos/2", width: 2048, height: 3072 },
    { key: "products/byblos/3", width: 2048, height: 3072 },
    { key: "products/byblos/4", width: 2048, height: 3072 },
  ],
  3: [
    { key: "products/nahr/1", width: 2048, height: 3072 },
    { key: "products/nahr/2", width: 2048, height: 3072 },
    { key: "products/nahr/3", width: 2048, height: 3072 },
    { key: "products/nahr/4", width: 2048, height: 3072 },
  ],
  4: [
    { key: "products/arz/2", width: 2048, height: 3072 },
    { key: "products/arz/3", width: 2048, height: 3072 },
    { key: "products/arz/4", width: 2048, height: 3072 },
    { key: "products/arz/5", width: 2048, height: 3072 },
  ],
  5: [
    { key: "products/batroun/1", width: 2048, height: 3072 },
    { key: "products/batroun/2", width: 2048, height: 3072 },
    { key: "products/batroun/3", width: 2048, height: 3072 },
    { key: "products/batroun/4", width: 2048, height: 1365 },
  ],
  6: [
    { key: "products/qadisha-earth/1", width: 2048, height: 3072 },
    { key: "products/qadisha-earth/2", width: 2048, height: 3072 },
    { key: "products/qadisha-earth/3", width: 2048, height: 3072 },
    { key: "products/qadisha-ash/1", width: 2048, height: 3072 },
    { key: "products/qadisha-ash/2", width: 2048, height: 3072 },
  ],
}
