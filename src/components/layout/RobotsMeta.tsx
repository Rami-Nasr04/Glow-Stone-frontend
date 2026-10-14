import { ALLOW_INDEXING } from "@/config/site"

interface RobotsMetaProps {
  allowIndexing?: boolean
}

// On every page until launch (VITE_ALLOW_INDEXING=false), so a shared preview link never ends up in search results.
export default function RobotsMeta({ allowIndexing = ALLOW_INDEXING }: RobotsMetaProps) {
  return allowIndexing ? null : <meta name="robots" content="noindex, nofollow" />
}
