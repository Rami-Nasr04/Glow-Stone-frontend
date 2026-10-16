import { AlertDialog } from "radix-ui"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  title: string
  text: string
  /** The safe choice; also Escape. */
  keep: string
  confirm: string
  onKeep: () => void
  onConfirm: () => void
}

const action = "min-h-12 flex-1 basis-36 text-label uppercase tracking-caps"

// Asked inside the page before anything is thrown away: unsaved changes on leaving, a photo before it's deleted.
export default function ConfirmDialog({ open, title, text, keep, confirm, onKeep, onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && onKeep()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-primary/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-115 -translate-x-1/2 -translate-y-1/2 flex-col gap-4 bg-studio-panel p-7">
          <AlertDialog.Title className="font-display text-3xl font-light">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-small">{text}</AlertDialog.Description>
          <div className="mt-2 flex flex-wrap gap-2">
            <AlertDialog.Cancel className={cn(action, "border border-primary")}>{keep}</AlertDialog.Cancel>
            <AlertDialog.Action onClick={onConfirm} className={cn(action, "border border-accent bg-accent text-accent-foreground")}>
              {confirm}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
