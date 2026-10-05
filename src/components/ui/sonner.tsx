import { Toaster as Sonner, type ToasterProps } from "sonner"

export default function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "bg-primary text-primary-foreground border-0 rounded-none",
          description: "text-primary-foreground/80",
        },
      }}
      {...props}
    />
  )
}
