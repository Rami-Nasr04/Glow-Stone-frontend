import { Check } from "lucide-react"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { PASSWORD_RULES } from "./rules"

export interface PasswordRule {
  key: string
  label: string
  test: (password: string) => boolean
}

interface PasswordRulesProps {
  password: string
  /** Another pool's policy (the studio's); the customer pool's rules by default. */
  rules?: readonly PasswordRule[]
}

// Live checklist under a new password; each rule says "(met)" or "(not yet met)" to screen readers.
export default function PasswordRules({ password, rules }: PasswordRulesProps) {
  const { m } = useLocale()
  const shown = rules ?? PASSWORD_RULES.map((rule) => ({ ...rule, label: m.auth.rules[rule.key] }))
  return (
    <ul className="flex flex-col gap-2">
      {shown.map((rule) => {
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
            <span className="sr-only"> {met ? m.auth.rules.met : m.auth.rules.notMet}</span>
          </li>
        )
      })}
    </ul>
  )
}
