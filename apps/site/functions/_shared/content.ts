export interface R2Bucket {
  get(key: string): Promise<R2Object | null>
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }
  ): Promise<unknown>
  list(options?: { prefix?: string }): Promise<{ objects: R2Object[] }>
}

export interface R2Object {
  key: string
  uploaded?: Date
  httpMetadata?: {
    contentType?: string
  }
  customMetadata?: Record<string, string>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface Env {
  CONTENT_BUCKET: R2Bucket
}

export interface Post {
  slug: string
  title: string
  date: string
  excerpt: string
  tags: string[]
  cover?: string
  content: string
  raw: string
}

export interface PageContent {
  slug: string
  title: string
  content: string
  raw: string
}

export const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers
    }
  })

export const pageKey = (slug: string) => `contents/pages/${slug}.md`
export const postKey = (slug: string) => `contents/posts/${slug}.md`

export const fallbackLanding = `---
title: "Slavic Alliance"
---

# Slavic Alliance

**Slavic Alliance** začala jako parta lidí, kterou baví kvízy, hospodská atmosféra a zdravě nezdravá chuť vyhrávat. Tým vznikl **25. srpna 2021**. První Hospodský kvíz jsme odehráli o necelé dva týdny později, **7. září 2021**.
Název Slavic Alliance pro nás znamená slovanskou alianci - tým různých hlav, znalostí a povah, které u stolu táhnou za jeden provaz.

Od pravidelných hospodských večerů jsme se dostali k medailím v pražských ligách, finálovým pódiím i výsledkům na celorepublikové úrovni.

## 🏆 Naše největší úspěchy

- 🥉 Mistrovství České republiky v Hospodském kvízu 2025
- 🥇 Pražské finále - leden 2024
- 🥇 Podzimní liga Prahy a středních Čech 2023
- 🥇 (Pod)zimní liga Prahy a středních Čech 2024/25
- 🥈 Jarní liga Prahy a středních Čech 2024
- 🥈 Pražské finále - červen 2024
- 🥉 Pražské finále - leden 2023
- 🥉 Pražské finále - únor 2025
- 🥉 Filmově-seriálová liga Na Kvíz 2024/25

## 📌 Další výsledky, které stojí za zmínku

- 4. místo na Kvízovém maratonu 2025
- 5. místo na Mistrovství České republiky v Hospodském kvízu 2023
- 5. místo na Mistrovství České republiky v Hospodském kvízu 2024
`

export const fallbackHello = `---
title: "Hello Slavic Alliance"
date: 2026-02-15T12:00:00.000Z
excerpt: "První článek z Markdownu."
tags: ["intro"]
---

Nazdar! Tohle je první post.
`

const parseValue = (value: string) => {
  const trimmed = value.trim()

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean)
  }

  return trimmed.replace(/^["']|["']$/g, "")
}

export const parseMarkdown = (raw: string) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const data: Record<string, string | string[]> = {}
  let content = raw

  if (match) {
    content = raw.slice(match[0].length)
    for (const line of match[1].split(/\r?\n/)) {
      const separator = line.indexOf(":")
      if (separator === -1) continue

      const key = line.slice(0, separator).trim()
      const value = line.slice(separator + 1)
      if (key) data[key] = parseValue(value)
    }
  }

  return { data, content }
}

export const pageFromMarkdown = (slug: string, raw: string): PageContent => {
  const { data, content } = parseMarkdown(raw)

  return {
    slug,
    title: String(data.title || "Slavic Alliance"),
    content,
    raw
  }
}

export const postFromMarkdown = (slug: string, raw: string): Post => {
  const { data, content } = parseMarkdown(raw)

  return {
    slug,
    title: String(data.title || slug),
    date: String(data.date || new Date().toISOString()),
    excerpt: String(data.excerpt || ""),
    tags: Array.isArray(data.tags) ? data.tags : [],
    cover: data.cover ? String(data.cover) : undefined,
    content,
    raw
  }
}

export const slugFromKey = (key: string) => key.split("/").pop()?.replace(/\.md$/, "") ?? ""

export const requireAccessUser = (request: Request) => {
  const email = request.headers.get("cf-access-authenticated-user-email")

  if (!email) {
    return json({ error: "Cloudflare Access authentication is required." }, { status: 401 })
  }

  return null
}
