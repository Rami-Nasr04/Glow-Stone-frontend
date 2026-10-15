import { Info } from "lucide-react"

interface StudioNoteProps {
  children: React.ReactNode
}

// A quiet, permanent note (how changes reach the website, photos coming later).
export default function StudioNote({ children }: StudioNoteProps) {
  return (
    <p className="flex max-w-170 items-start gap-2.5 text-sm text-muted-foreground">
      <Info aria-hidden="true" strokeWidth={1.25} className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
