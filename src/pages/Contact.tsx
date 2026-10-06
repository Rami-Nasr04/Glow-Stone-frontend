import { MoveRight } from "lucide-react"
import ContactForm from "@/components/contact/ContactForm"
import { actionVariants } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { CONTACT_EMAIL, INSTAGRAM_URL, WHATSAPP_URL } from "@/config/site"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

const label = "text-label uppercase tracking-label"
const arrow = <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />

export default function Contact() {
  const { m } = useLocale()
  const whatsapp = WHATSAPP_URL

  return (
    <section className="px-gutter pt-[clamp(4.25rem,11vw,9.75rem)] pb-[clamp(7.5rem,13vw,12rem)]">
      <div className="mx-auto flex max-w-content flex-wrap items-start gap-x-[clamp(4rem,10vw,10rem)] gap-y-20">
        <div className="flex max-w-160 flex-[1.5_1_27.5rem] flex-col gap-7">
          <h1 className="font-display text-display-xl leading-none font-light">{m.contact.title}</h1>
          <Rule />
          <p className="text-pretty text-muted-foreground">{m.contact.intro}</p>

          {/* Phones: WhatsApp, the quickest channel, comes before the form. */}
          {whatsapp && (
            <div className="mt-2 flex flex-col gap-4 border-y border-border py-7 md:hidden">
              <p className={label}>{m.contact.whatsapp}</p>
              <p className="text-small text-muted-foreground">{m.contact.whatsappLead}</p>
              <a href={whatsapp} className={cn(actionVariants({ variant: "solid" }), "w-full")}>
                {m.contact.chatOnWhatsApp}
                {arrow}
              </a>
            </div>
          )}

          <ContactForm />
        </div>

        <aside className="flex max-w-100 flex-[1_1_18.75rem] flex-col md:pt-[clamp(0rem,8vw,9.5rem)]">
          {whatsapp && (
            <div className="hidden flex-col gap-4 border-b border-border pb-9 md:flex">
              <p className={label}>{m.contact.whatsapp}</p>
              <p className="text-small text-muted-foreground">{m.contact.whatsappLead}</p>
              <a href={whatsapp} className={cn(actionVariants({ variant: "outline" }), "mt-2 self-start")}>
                {m.contact.chatOnWhatsApp}
                {arrow}
              </a>
            </div>
          )}
          {INSTAGRAM_URL && (
            <div className="flex flex-col gap-2 border-b border-border py-9">
              <p className={label}>{m.contact.instagram}</p>
              <a href={INSTAGRAM_URL} className="flex min-h-11 items-center font-display text-lead transition-colors duration-500 hover:text-accent">
                {m.contact.instagramLink}
              </a>
            </div>
          )}
          <div className="flex flex-col gap-2 border-b border-border py-9">
            <p className={label}>{m.contact.email}</p>
            {/* Jost, not the display serif: its old-style numerals make "216" hard to read. */}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex min-h-11 items-center font-sans text-lg tracking-wide break-all transition-colors duration-500 hover:text-accent"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          <p className="mt-9 font-display text-2xl leading-snug font-light italic">{m.collection.bespoke}</p>
        </aside>
      </div>
    </section>
  )
}
