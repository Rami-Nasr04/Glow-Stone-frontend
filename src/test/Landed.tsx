import { useLocation } from "react-router"

/** Shows where a redirect landed: "landed: /studio/products?x=1". */
export default function Landed() {
  const { pathname, search } = useLocation()
  return <p>landed: {pathname + search}</p>
}
