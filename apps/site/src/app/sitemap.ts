import type { MetadataRoute } from "next"

import { getAllPosts } from "@/lib/posts"

const siteUrl = "https://slavicalliance.cz"

export const dynamic = "force-static"

const sitemap = (): MetadataRoute.Sitemap => {
  const pages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/vysledky`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ]

  const posts = getAllPosts().map((post) => ({
    url: `${siteUrl}/posts/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }))

  return [...pages, ...posts]
}

export default sitemap
