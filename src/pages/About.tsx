import AboutClose from "@/components/about/AboutClose"
import AboutIntro from "@/components/about/AboutIntro"
import Chapters from "@/components/about/Chapters"
import OmarStory from "@/components/about/OmarStory"
import PullQuote from "@/components/about/PullQuote"

// Omar's story first (Rami, 2026-11-02), then the page's title and the chapters.
export default function About() {
  return (
    <>
      <OmarStory />
      <AboutIntro />
      <Chapters />
      <PullQuote />
      <AboutClose />
    </>
  )
}
