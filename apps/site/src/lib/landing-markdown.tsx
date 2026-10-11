export const isSafeLink = (href: string) =>
  href.startsWith("https://") ||
  href.startsWith("http://") ||
  href.startsWith("mailto:") ||
  href.startsWith("/") ||
  href.startsWith("./") ||
  href.startsWith("../") ||
  href.startsWith("#")

export const normaliseHref = (href: string) => href

export const renderInlineMarkdown = (text: string) => {
  return text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|_[^_]+_)/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)

    if (link) {
      const [, label, href] = link
      const normalisedHref = normaliseHref(href)

      if (!isSafeLink(normalisedHref)) {
        return label
      }

      return (
        <a
          key={index}
          href={normalisedHref}
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
