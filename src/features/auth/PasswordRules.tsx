import { useLocale } from "@/i18n/useLocale"
import PasswordChecklist from "./PasswordChecklist"
import { PASSWORD_RULES } from "./rules"

interface PasswordRulesProps {
  password: string
}

// The customer pool's rules, in the shop's words.
export default function PasswordRules({ password }: PasswordRulesProps) {
  const { m } = useLocale()
  const rules = PASSWORD_RULES.map((rule) => ({ ...rule, label: m.auth.rules[rule.key] }))
  return <PasswordChecklist password={password} rules={rules} metLabel={m.auth.rules.met} notMetLabel={m.auth.rules.notMet} />
}
