import { BrowserRouter, Route, Routes } from "react-router"
import Toaster from "@/components/ui/sonner"
import ThemeProvider from "@/contexts/ThemeProvider"
import Home from "@/pages/Home"
import NotFound from "@/pages/NotFound"

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <div className="flex min-h-svh flex-col bg-background text-foreground">
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-right" />
      </ThemeProvider>
    </BrowserRouter>
  )
}
