"use client"

import { useEffect, useState } from "react"

const renderInlineMarkdown = (text: string) => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-white">
          {part.slice(2, -2)}
        </strong>
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
