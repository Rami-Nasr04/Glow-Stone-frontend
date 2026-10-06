import { createCn } from "cn/config"

// Class merging that knows the theme's own type scale and letter-spacing (src/index.css @theme).
// Without this, a custom size like text-label is mistaken for a colour and dropped when a text colour follows.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["label", "body", "small", "price", "lead", "quote", "display-m", "display-l", "display-xl", "display-hero"] }],
      tracking: [{ tracking: ["label", "caps", "display", "price"] }],
    },
  },
})
