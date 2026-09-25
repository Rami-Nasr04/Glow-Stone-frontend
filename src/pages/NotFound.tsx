import { Link } from "react-router"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <section className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-heading text-4xl font-semibold">404</h1>
      <p className="text-muted-foreground">This page doesn't exist.</p>
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </section>
  )
}
