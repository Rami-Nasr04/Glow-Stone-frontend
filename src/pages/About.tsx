import AboutClose from "@/components/about/AboutClose"
import AboutIntro from "@/components/about/AboutIntro"
import Chapters from "@/components/about/Chapters"
import PullQuote from "@/components/about/PullQuote"

interface AboutProps {
  /** The name of the piece in the crest photo (Arz), or null when it isn't published. */
  crestName: string | null
}

export default function About({ crestName }: AboutProps) {
  return (
    <>
      <AboutIntro />
      <Chapters crestName={crestName} />
      <PullQuote />
      <AboutClose />
    </>
  )
}
