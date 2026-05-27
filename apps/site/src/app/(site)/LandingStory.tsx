"use client"

import { useEffect, useState } from "react"

const isSafeLink = (href: string) =>
  href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:")

const renderInlineMarkdown = (text: string) => {
  return text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|_[^_]+_)/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)

    if (link) {
      const [, label, href] = link

      if (!isSafeLink(href)) {
        return label
      }

      return (
        <a
          key={index}
          href={href}
          className="font-semibold text-sky-200 underline decoration-sky-200/40 underline-offset-4 hover:text-white"
        >
          {label}
        </a>
      )
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }

    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={index} className="text-white/95">
          {part.slice(1, -1)}
        </em>
      )
    }

    return part
  })
}

export const LandingStory = ({ initialContent }: { initialContent: string }) => {
  const [content, setContent] = useState(initialContent)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }

    const controller = new AbortController()

    fetch("/api/content/pages/landing", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Landing content returned HTTP ${response.status}`)
        }

        return response.json() as Promise<{ content?: string }>
      })
      .then((payload) => {
        if (typeof payload.content === "string") {
          setContent(payload.content)
        }
      })
      .catch(() => {
        // Keep the build-time local Markdown fallback if R2 is unavailable.
      })

    return () => controller.abort()
  }, [])

  return (
    <section className="mb-14">
      <div className="mx-auto max-w-4xl space-y-8 text-center text-white/86">
        {content
          .split(/\n\s*\n/)
          .map((block) => block.trim())
          .filter(Boolean)
          .map((block, index) => {
            if (block.startsWith("# ")) {
              return (
                <h1
                  key={index}
                  className="text-4xl font-bold tracking-tight text-white sm:text-5xl"
                >
                  {renderInlineMarkdown(block.replace(/^#\s+/, ""))}
                </h1>
              )
            }

            if (block.startsWith("## ")) {
              return (
                <h2 key={index} className="pt-4 text-2xl font-bold text-white">
                  {renderInlineMarkdown(block.replace(/^##\s+/, ""))}
                </h2>
              )
            }

            if (block.startsWith("### ")) {
              return (
                <h3 key={index} className="pt-2 text-xl font-bold text-white">
                  {renderInlineMarkdown(block.replace(/^###\s+/, ""))}
                </h3>
              )
            }

            if (block.startsWith("- ")) {
              return (
                <ul
                  key={index}
                  className="mx-auto grid max-w-3xl gap-2 text-left text-lg leading-8"
                >
                  {block.split("\n").map((item) => (
                    <li key={item}>• {renderInlineMarkdown(item.replace(/^-\s+/, ""))}</li>
                  ))}
                </ul>
              )
            }

            if (block.startsWith("> ")) {
              const lines = block.split("\n")

              return (
                <blockquote
                  key={index}
                  className="mx-auto max-w-3xl border-l-2 border-sky-200/50 pl-5 text-left text-lg leading-8 text-white/80"
                >
                  {lines.map((line, lineIndex) => (
                    <span key={lineIndex}>
                      {renderInlineMarkdown(line.replace(/^>\s+/, ""))}
                      {lineIndex < lines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </blockquote>
              )
            }

            return (
              <p key={index} className="mx-auto max-w-3xl text-lg leading-8">
                {renderInlineMarkdown(block)}
              </p>
            )
          })}
      </div>
    </section>
  )
}
