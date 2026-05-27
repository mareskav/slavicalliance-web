import type { MetadataRoute } from "next"

const siteUrl = "https://slavicalliance.cz"

export const dynamic = "force-static"

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: "*",
    allow: "/",
  },
  sitemap: `${siteUrl}/sitemap.xml`,
})

export default robots
