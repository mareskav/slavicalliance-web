"use client"

import { useEffect, useState } from "react"

import type { LandingContentSource } from "@/lib/landing"
import { renderInlineMarkdown } from "@/lib/landing-markdown"
import { LandingIntroLoadingState } from "./LandingLoadingState"

const extractLandingIntro = (content: string) => content.replace(/\n##[\s\S]*$/, "").trim()

export const LandingStory = ({
  initialContent,
  contentSource
}: {
  initialContent: string
  contentSource: LandingContentSource
}) => {
  const fallbackContent = extractLandingIntro(initialContent)
  // Static export may only have the repository Markdown at build time. In production, avoid
  // showing that stale fallback before the R2-backed content API responds.
  const deferInitialContent = process.env.NODE_ENV === "production" && contentSource !== "remote"
  const [content, setContent] = useState<string | null>(
    deferInitialContent ? null : fallbackContent
  )

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }

    const controller = new AbortController()

    fetch("/api/content/pages/landing", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.json() as Promise<{ content?: string }>
      })
      .then((payload) => {
        if (typeof payload.content === "string") {
          setContent(extractLandingIntro(payload.content))
        } else if (deferInitialContent) {
          setContent(fallbackContent)
        }
      })
      .catch(() => {
        if (deferInitialContent) {
          setContent(fallbackContent)
        }
      })

    return () => controller.abort()
  }, [deferInitialContent, fallbackContent])

  if (content === null) {
    return <LandingIntroLoadingState />
  }

  const blocks = content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  const revealStyle = (index: number) =>
    ({
      "--landing-reveal-delay": `${Math.min(index * 90, 540)}ms`
    }) as React.CSSProperties

  return (
    <section className="landing-section-reveal mb-14">
      <div className="mx-auto max-w-4xl space-y-8 text-center text-white/86">
        {blocks.map((block, index) => {
          const className = "landing-reveal-item"

          if (block.startsWith("# ")) {
            return (
              <h1
                key={index}
                className={`${className} text-4xl font-bold tracking-tight text-white sm:text-5xl`}
                style={revealStyle(index)}
              >
                {renderInlineMarkdown(block.replace(/^#\s+/, ""))}
              </h1>
            )
          }

          if (block.startsWith("## ")) {
            return (
              <h2
                key={index}
                className={`${className} pt-4 text-2xl font-bold text-white`}
                style={revealStyle(index)}
              >
                {renderInlineMarkdown(block.replace(/^##\s+/, ""))}
              </h2>
            )
          }

          if (block.startsWith("### ")) {
            return (
              <h3
                key={index}
                className={`${className} pt-2 text-xl font-bold text-white`}
                style={revealStyle(index)}
              >
                {renderInlineMarkdown(block.replace(/^###\s+/, ""))}
              </h3>
            )
          }

          if (block.startsWith("- ")) {
            return (
              <ul
                key={index}
                className={`${className} mx-auto grid max-w-3xl gap-2 text-left text-lg leading-8`}
                style={revealStyle(index)}
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
                className={`${className} mx-auto max-w-3xl border-l-2 border-sky-200/50 pl-5 text-left text-lg leading-8 text-white/80`}
                style={revealStyle(index)}
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
            <p
              key={index}
              className={`${className} mx-auto max-w-3xl text-lg leading-8`}
              style={revealStyle(index)}
            >
              {renderInlineMarkdown(block)}
            </p>
          )
        })}
      </div>
    </section>
  )
}
