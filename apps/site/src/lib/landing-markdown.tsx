export const isSafeLink = (href: string) =>
  href.startsWith("https://") ||
  href.startsWith("http://") ||
  href.startsWith("mailto:") ||
  href.startsWith("/") ||
  href.startsWith("./") ||
  href.startsWith("../") ||
  href.startsWith("#")

export const normaliseHref = (href: string) => {
  if (href.startsWith("/vysledky")) {
    const resultsHref =
      process.env.NEXT_PUBLIC_RESULTS_APP_URL?.trim() ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3001/vysledky" : "/vysledky")

    try {
      const base = new URL(resultsHref, "http://localhost")
      const target = new URL(href, "http://localhost")
      base.search = target.search
      if (resultsHref.startsWith("http://") || resultsHref.startsWith("https://")) {
        return `${base.origin}${base.pathname}${base.search}`
      }
      return `${base.pathname}${base.search}`
    } catch {
      return href
    }
  }

  return href
}

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
