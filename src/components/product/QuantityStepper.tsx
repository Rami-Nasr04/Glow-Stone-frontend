import { Minus, Plus } from "lucide-react"
import { useLocale } from "@/i18n/useLocale"

interface QuantityStepperProps {
  value: number
  /** Pieces remaining in the edition (the server enforces it again at checkout). */
  max: number
  onChange: (value: number) => void
  /** Names for the − and + buttons where several steppers share a screen (the cart: "One more Sannine"). */
  labels?: { decrease: string; increase: string }
}

const step = "flex size-12 items-center justify-center transition-opacity duration-500 disabled:opacity-35"

export default function QuantityStepper({ value, max, onChange, labels }: QuantityStepperProps) {
  const { m } = useLocale()
  const { decrease, increase } = labels ?? { decrease: m.product.decrease, increase: m.product.increase }
  return (
    <div className="flex items-center border border-primary/40">
      <button type="button" aria-label={decrease} disabled={value <= 1} onClick={() => onChange(value - 1)} className={step}>
        <Minus aria-hidden="true" strokeWidth={1.1} className="size-4" />
      </button>
      <output role="status" className="w-10 text-center text-sm tracking-wide">
        {value}
      </output>
      <button type="button" aria-label={increase} disabled={value >= max} onClick={() => onChange(value + 1)} className={step}>
        <Plus aria-hidden="true" strokeWidth={1.1} className="size-4" />
      </button>
    </div>
  )
}
