import { Navigate } from "react-router"
import { studioPath } from "@/config/studio"

export default function StudioIndex() {
  return <Navigate replace to={studioPath("/products")} />
}
