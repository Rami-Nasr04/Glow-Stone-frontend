import { useRef } from "react"
import { cn } from "@/lib/utils"
import { CODE_LENGTH } from "./code"

interface CodeInputProps {
  /** Prefix for the box ids: `${idPrefix}-0` … `${idPrefix}-5`. */
  idPrefix: string
  value: string[]
  onChange: (next: string[]) => void
  label: string
  digitLabel: (n: number) => string
  invalid?: boolean
  describedBy?: string
}

// The emailed 6-digit code: one box per digit, left to right in every language. Typing moves on, Backspace on an
// empty box moves back, and a pasted or autofilled code fills every box.
export default function CodeInput({ idPrefix, value, onChange, label, digitLabel, invalid = false, describedBy }: CodeInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const focus = (index: number) => boxes.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus()

  // A whole code goes in from the first box; a few digits fill on from the box they were typed into.
  const spread = (digits: string, from: number) => {
    const start = digits.length >= CODE_LENGTH ? 0 : from
    const next = [...value]
    for (const [offset, digit] of [...digits.slice(0, CODE_LENGTH - start)].entries()) next[start + offset] = digit
    onChange(next)
    focus(start + Math.min(digits.length, CODE_LENGTH - start))
  }

  const type = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "")
    if (!digits) {
      if (!raw) onChange(value.map((digit, i) => (i === index ? "" : digit)))
      return
    }
    // One new digit replaces the box (the old one may still be in the input); more is an autofill.
    if (digits.length <= 2 && raw.length <= 2) {
      const digit = digits.at(-1) ?? ""
      onChange(value.map((current, i) => (i === index ? digit : current)))
      focus(index + 1)
      return
    }
    spread(digits, index)
  }

  const keyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      e.preventDefault()
      onChange(value.map((digit, i) => (i === index - 1 ? "" : digit)))
      focus(index - 1)
    } else if (e.key === "ArrowLeft") focus(index - 1)
    else if (e.key === "ArrowRight") focus(index + 1)
  }

  const paste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const digits = e.clipboardData.getData("text").replace(/\D/g, "")
    if (digits) spread(digits, index)
  }

  return (
    <div role="group" aria-label={label} dir="ltr" className="flex justify-center gap-2.5">
      {value.map((digit, index) => (
        <input
          // The boxes are positions, not list items: the index is their identity.
          key={index}
          ref={(element) => {
            boxes.current[index] = element
          }}
          id={`${idPrefix}-${index}`}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={digitLabel(index + 1)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={digit}
          onChange={(e) => type(index, e.target.value)}
          onKeyDown={(e) => keyDown(index, e)}
          onPaste={(e) => paste(index, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-15 w-12 border bg-card text-center text-[1.375rem] transition-[border-color,box-shadow] duration-500 focus:border-accent focus:shadow-[0_0_0_1px_var(--accent)] focus:outline-none",
            invalid ? "border-accent" : "border-primary/30",
          )}
        />
      ))}
    </div>
  )
}
