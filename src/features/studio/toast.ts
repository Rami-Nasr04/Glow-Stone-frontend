import { type ExternalToast, toast } from "sonner"

// The studio's toasts sit at the top centre: top-right (the shop's place) would cover "New product" and the
// stars, and the bottom would cover the save bar.
const place: ExternalToast = { position: "top-center" }

export const studioToast = {
  success: (message: string, options: ExternalToast = {}) => toast.success(message, { ...options, ...place }),
  error: (message: string) => toast.error(message, place),
}
