import { Check } from "lucide-react"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { PASSWORD_RULES } from "./rules"

interface PasswordRulesProps {
  password: string
}

// Live checklist under a new password; each rule says "(met)" or "(not yet met)" to screen readers.
export default function PasswordRules({ password }: PasswordRulesProps) {
  const { m } = useLocale()
  return (
    <ul className="flex flex-col gap-2">
      {PASSWORD_RULES.map((rule) => {
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
            <span>{m.auth.rules[rule.key]}</span>
            <span className="sr-only"> {met ? m.auth.rules.met : m.auth.rules.notMet}</span>
          </li>
        )
      })}
    </ul>
  )
}
