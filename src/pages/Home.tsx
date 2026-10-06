import CraftCollage from "@/components/home/CraftCollage"
import HomeHero from "@/components/home/HomeHero"
import PieceSpotlight from "@/components/home/PieceSpotlight"
import QuoteBand from "@/components/home/QuoteBand"
import SelectedPieces from "@/components/home/SelectedPieces"

export default function Home() {
  return (
    <>
      <HomeHero />
      <QuoteBand />
      <SelectedPieces />
      <CraftCollage />
      <PieceSpotlight />
    </>
  )
}
