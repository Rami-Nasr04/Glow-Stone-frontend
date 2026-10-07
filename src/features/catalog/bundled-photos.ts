// Bundled photos per provisional product id, until the product_images slice adds `images` and `cover` to the API.
// The files themselves are unchanged (public/images/products/<folder>/<n>-<width>.webp).
export const BUNDLED_PHOTOS: Record<number, readonly { key: string; width: number; height: number }[]> = {
  1: [
    { key: "products/arz/1", width: 2048, height: 3072 },
    { key: "products/arz/2", width: 2048, height: 3072 },
    { key: "products/arz/3", width: 2048, height: 3072 },
    { key: "products/arz/4", width: 2048, height: 3072 },
    { key: "products/arz/5", width: 2048, height: 3072 },
  ],
  2: [
    { key: "products/nahr/1", width: 2048, height: 3072 },
    { key: "products/nahr/2", width: 2048, height: 3072 },
    { key: "products/nahr/3", width: 2048, height: 3072 },
    { key: "products/nahr/4", width: 2048, height: 3072 },
  ],
  3: [
    { key: "products/batroun/1", width: 2048, height: 3072 },
    { key: "products/batroun/2", width: 2048, height: 3072 },
    { key: "products/batroun/3", width: 2048, height: 3072 },
    { key: "products/batroun/4", width: 2048, height: 1365 },
  ],
  4: [
    { key: "products/byblos/1", width: 2048, height: 3072 },
    { key: "products/byblos/2", width: 2048, height: 3072 },
    { key: "products/byblos/3", width: 2048, height: 3072 },
    { key: "products/byblos/4", width: 2048, height: 3072 },
  ],
  5: [
    { key: "products/qadisha-ash/1", width: 2048, height: 3072 },
    { key: "products/qadisha-ash/2", width: 2048, height: 3072 },
  ],
  6: [
    { key: "products/qadisha-earth/1", width: 2048, height: 3072 },
    { key: "products/qadisha-earth/2", width: 2048, height: 3072 },
    { key: "products/qadisha-earth/3", width: 2048, height: 3072 },
  ],
  7: [
    { key: "products/sannine-ash/1", width: 2048, height: 3072 },
    { key: "products/sannine-ash/2", width: 2048, height: 3072 },
    { key: "products/sannine-ash/3", width: 2048, height: 3072 },
  ],
  8: [
    { key: "products/sannine-sand/1", width: 2048, height: 3072 },
    { key: "products/sannine-sand/2", width: 2048, height: 3072 },
    { key: "products/sannine-sand/3", width: 2048, height: 3072 },
    { key: "products/sannine-sand/4", width: 2048, height: 3072 },
  ],
}
