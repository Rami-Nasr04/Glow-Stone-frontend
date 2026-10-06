import { Minus, Plus } from "lucide-react"
import { useLocale } from "@/i18n/useLocale"

interface QuantityStepperProps {
  value: number
  /** Pieces remaining in the edition (the server enforces it again at checkout). */
  max: number
  onChange: (value: number) => void
}

const step = "flex size-12 items-center justify-center transition-opacity duration-500 disabled:opacity-35"

export default function QuantityStepper({ value, max, onChange }: QuantityStepperProps) {
  const { m } = useLocale()
  return (
    <div className="flex items-center border border-primary/40">
      <button type="button" aria-label={m.product.decrease} disabled={value <= 1} onClick={() => onChange(value - 1)} className={step}>
        <Minus aria-hidden="true" strokeWidth={1.1} className="size-4" />
      </button>
      <output role="status" className="w-10 text-center text-sm tracking-wide">
        {value}
      </output>
      <button type="button" aria-label={m.product.increase} disabled={value >= max} onClick={() => onChange(value + 1)} className={step}>
        <Plus aria-hidden="true" strokeWidth={1.1} className="size-4" />
      </button>
    </div>
  )
}
