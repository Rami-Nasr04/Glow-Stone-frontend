import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PasswordRule {
  key: string
  label: string
  test: (password: string) => boolean
}

interface PasswordChecklistProps {
  password: string
  rules: readonly PasswordRule[]
  /** Read to screen readers after each rule: "(met)" / "(not yet met)". */
  metLabel: string
  notMetLabel: string
}

// Live checklist under a new password, for either pool's policy. It takes its words from the caller, so the studio
// shows it without the shop's dictionary.
export default function PasswordChecklist({ password, rules, metLabel, notMetLabel }: PasswordChecklistProps) {
  return (
    <ul className="flex flex-col gap-2">
      {rules.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.key}
            className={cn("flex items-center gap-3 text-sm transition-colors duration-500", met ? "text-foreground" : "text-muted-foreground")}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-3.5 shrink-0 items-center justify-center border transition-colors duration-500",
                met ? "border-primary bg-primary" : "border-primary/40",
              )}
            >
              <Check strokeWidth={2} className={cn("size-2.5 text-primary-foreground", !met && "opacity-0")} />
            </span>
            <span>{rule.label}</span>
            <span className="sr-only"> {met ? metLabel : notMetLabel}</span>
          </li>
        )
      })}
    </ul>
  )
}
