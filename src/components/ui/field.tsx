import { CircleAlert } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

// The prototype's underlined input: the line turns wine on focus.
export const inputClass =
  "w-full min-w-0 border-b border-primary bg-transparent pt-1.5 pb-3 text-base transition-[border-color,box-shadow] duration-500 focus:border-accent focus:shadow-[0_1px_0_var(--accent)] focus:outline-none aria-invalid:border-accent"

export interface ControlProps {
  id: string
  "aria-invalid"?: true
  "aria-describedby"?: string
}

interface FieldProps {
  id: string
  label: string
  error?: string
  /** Announce the error at once (answers from the server); field checks are reached by moving focus instead. */
  announce?: boolean
  /** Text under the control (e.g. the password rules), announced with it. */
  hint?: React.ReactNode
  className?: string
  children: (control: ControlProps) => React.ReactNode
}

// The label turns wine with the line; an error carries a mark and words, never colour alone.
export function Field({ id, label, error, announce = false, hint, className, children }: FieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ")
  return (
    <div className={cn("group flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-label uppercase tracking-label transition-colors duration-500 group-focus-within:text-accent",
          error ? "text-accent" : "text-muted-foreground",
        )}
      >
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy || undefined })}
      {error && (
        <p id={`${id}-error`} role={announce ? "alert" : undefined} className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert aria-hidden="true" strokeWidth={1.25} className="size-4 shrink-0" />
          {error}
        </p>
      )}
      {hint && <div id={`${id}-hint`}>{hint}</div>}
    </div>
  )
}

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showLabel: string
  hideLabel: string
}

export function PasswordInput({ showLabel, hideLabel, className, ...props }: PasswordInputProps) {
  const [shown, setShown] = useState(false)
  return (
    <div className="flex items-center border-b border-primary transition-[border-color,box-shadow] duration-500 focus-within:border-accent focus-within:shadow-[0_1px_0_var(--accent)] has-aria-invalid:border-accent">
      <input type={shown ? "text" : "password"} className={cn("min-w-0 flex-1 bg-transparent pt-1.5 pb-3 text-base focus:outline-none [&::-ms-reveal]:hidden", className)} {...props} />
      <button
        type="button"
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
        className="min-h-11 min-w-11 text-label uppercase tracking-caps text-muted-foreground transition-colors duration-500 hover:text-foreground"
      >
        {shown ? hideLabel : showLabel}
      </button>
    </div>
  )
}
