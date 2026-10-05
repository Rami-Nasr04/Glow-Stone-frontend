import { Outlet } from "react-router"

export default function LocaleLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
