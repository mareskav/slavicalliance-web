import type { Metadata } from "next"
import { ArrowUpRight, Facebook, Newspaper } from "lucide-react"

import { getPressMentions } from "@/lib/press"

export const metadata: Metadata = {
  title: "Napsali o nás",
  description: "Články, reportáže a příspěvky, ve kterých se psalo o týmu Slavic Alliance.",
  alternates: {
    canonical: "/napsali-o-nas"
  }
}

const NapsaliONasPage = async () => {
  const pressMentions = await getPressMentions()

  return (
    <div className="space-y-8 pb-16 font-sans sm:pb-24">
      <section>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-4xl">
          Napsali o nás
        </h1>
        <p className="mt-3 max-w-3xl text-base font-medium leading-6 text-white/58 sm:text-lg">
          Články a příspěvky, ve kterých se psalo o týmu Slavic Alliance
        </p>
      </section>

      {pressMentions.length === 0 ? (
        <p className="text-base text-white/45">Zatím tu nic není. Brzy přibydou první zmínky.</p>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2">
        {pressMentions.map((mention) => {
          const SourceIcon = mention.sourceType === "facebook" ? Facebook : Newspaper

          return (
            <article
              key={mention.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 ring-1 ring-white/5 transition-colors hover:border-sky-100/25 hover:bg-white/8"
            >
              <a
                href={mention.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-linear-to-br from-white/8 to-white/2">
                  {mention.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mention.imageUrl}
                      alt={mention.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <SourceIcon className="h-12 w-12 text-white/25" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-200/70">
                    <SourceIcon className="h-4 w-4" />
                    <span>{mention.source}</span>
                    <span className="text-white/30">·</span>
                    <span className="font-medium normal-case tracking-normal text-white/45">
                      {mention.date}
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold leading-6 text-white transition-colors group-hover:text-sky-100">
                    {mention.title}
                  </h2>

                  <p className="text-sm leading-6 text-white/55">{mention.excerpt}</p>

                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-sky-200/80 transition-colors group-hover:text-sky-100">
                    Přečíst
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </a>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default NapsaliONasPage
