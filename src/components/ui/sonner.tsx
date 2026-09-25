import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/hooks/useTheme"

export default function Toaster({ ...props }: ToasterProps) {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "bg-popover text-popover-foreground border-border",
          description: "text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}
