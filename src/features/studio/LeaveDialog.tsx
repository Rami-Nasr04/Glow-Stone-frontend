import { AlertDialog } from "radix-ui"
import { cn } from "@/lib/utils"
import { STUDIO_COPY } from "./copy"

interface LeaveDialogProps {
  open: boolean
  onStay: () => void
  onLeave: () => void
}

const t = STUDIO_COPY.leave
const action = "min-h-12 flex-1 basis-36 text-label uppercase tracking-caps"

// Asked before unsaved changes are thrown away (a link, the back button, signing out).
export default function LeaveDialog({ open, onStay, onLeave }: LeaveDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && onStay()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-primary/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-115 -translate-x-1/2 -translate-y-1/2 flex-col gap-4 bg-studio-panel p-7">
          <AlertDialog.Title className="font-display text-3xl font-light">{t.title}</AlertDialog.Title>
          <AlertDialog.Description className="text-small">{t.text}</AlertDialog.Description>
          <div className="mt-2 flex flex-wrap gap-2">
            <AlertDialog.Cancel className={cn(action, "border border-primary")}>{t.stay}</AlertDialog.Cancel>
            <AlertDialog.Action onClick={onLeave} className={cn(action, "border border-accent bg-accent text-accent-foreground")}>
              {t.leave}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
