import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

// Called at the end of the local -> Neon sync so cached standings built from
// half-restored data don't linger for 24 hours. Protected by REVALIDATE_TOKEN.
const encoder = new TextEncoder()

const isTokenValid = async (provided: string, expected: string) => {
  const [a, b] = await Promise.all(
    [provided, expected].map(async (value) => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))))
  )
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index]
  }
  return diff === 0
}

export const POST = async (request: Request) => {
  const expected = process.env.REVALIDATE_TOKEN?.trim()

  if (!expected) {
    return NextResponse.json({ error: "Revalidation is not configured." }, { status: 503 })
  }

  const authorization = request.headers.get("authorization") ?? ""
  const provided = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : ""

  if (!provided || !(await isTokenValid(provided, expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  revalidateTag("quiz-results", { expire: 0 })
  return NextResponse.json({ revalidated: true })
}
