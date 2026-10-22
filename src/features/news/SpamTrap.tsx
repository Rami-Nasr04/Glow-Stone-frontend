interface SpamTrapProps {
  ref: React.Ref<HTMLInputElement>
}

// A field real visitors never see or reach. Bots fill in every field they find; the API then answers 204 and saves
// nothing (api-contract: `website`). Read its value when sending.
export default function SpamTrap({ ref }: SpamTrapProps) {
  return <input ref={ref} type="text" name="website" defaultValue="" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" />
}
