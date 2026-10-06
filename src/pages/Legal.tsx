import { NavLink, useParams } from "react-router"
import { isLegalDoc, LEGAL_DOCS, type LegalDoc } from "@/components/legal/docs"
import { Rule } from "@/components/ui/rule"
import { CONTACT_EMAIL } from "@/config/site"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import NotFound from "@/pages/NotFound"

// Unconfirmed text is written as "[Placeholder: …]" and shown in wine until Omar replaces it.
const placeholder = (text: string) => text.startsWith("[")

export default function Legal() {
  const { doc } = useParams()
  const { m, to } = useLocale()
  if (!isLegalDoc(doc)) return <NotFound />

  const { title, sections } = m.legal.docs[doc]
  const tabLabels: Record<LegalDoc, string> = { terms: m.footer.terms, privacy: m.footer.privacy, delivery: m.footer.delivery }

  return (
    <section className="px-gutter pt-[clamp(3.25rem,10vw,7.75rem)] pb-[clamp(7rem,12vw,11rem)]">
      <div className="mx-auto flex max-w-275 flex-col gap-[clamp(3.5rem,7vw,6rem)]">
        <div className="flex flex-col gap-6">
          <nav aria-label={m.legal.documents} className="flex flex-wrap gap-x-7">
            {LEGAL_DOCS.map((key) => (
              <NavLink
                key={key}
                to={to(`/legal/${key}`)}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center border-b text-label uppercase tracking-label transition-colors duration-500",
                    isActive ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {tabLabels[key]}
              </NavLink>
            ))}
          </nav>
          <h1 className="font-display text-display-xl leading-[1.02] font-light">{title}</h1>
          <Rule />
          <p className="text-sm text-muted-foreground">
            {m.legal.lastUpdated} <span className="text-accent">{m.legal.lastUpdatedValue}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-x-[clamp(3rem,8vw,8rem)] gap-y-12">
          <nav aria-label={m.legal.contents} className="max-w-70 flex-[1_1_13.75rem] md:sticky md:top-30">
            <ol className="border-t border-border">
              {sections.map((section, i) => (
                <li key={section.heading}>
                  <a
                    href={`#section-${i + 1}`}
                    className="flex min-h-11 items-center gap-3.5 border-b border-border text-sm transition-colors duration-500 hover:text-accent"
                  >
                    <span className="text-label tracking-caps text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex max-w-160 flex-[2_1_27.5rem] flex-col gap-14">
            {sections.map((section, i) => (
              <article key={section.heading} id={`section-${i + 1}`} className="flex scroll-mt-30 flex-col gap-4">
                <span className="text-label tracking-label text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="font-display text-lead leading-tight font-light">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className={cn("leading-relaxed", placeholder(paragraph) && "text-accent")}>
                    {paragraph}
                  </p>
                ))}
              </article>
            ))}
            <p className="border-t border-border pt-8 text-small text-muted-foreground">
              {m.legal.questions}{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-sans text-accent underline-offset-4 hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
