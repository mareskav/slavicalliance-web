import { Pool, type QueryResult, type QueryResultRow } from "pg"

let pool: Pool | null = null

const getDatabaseUrl = () => {
  return process.env.DATABASE_URL_RW?.trim()
}

const getPool = () => {
  const connectionString = getDatabaseUrl()

  if (!connectionString) {
    throw new Error("DATABASE_URL_RW is missing for results app.")
  }

  pool ??= new Pool({
    connectionString,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 5000,
    max: 2,
    maxLifetimeSeconds: 60,
    query_timeout: 4000,
    statement_timeout: 4000
  })
  return pool
}

const resetPool = async () => {
  const poolToReset = pool
  pool = null

  if (!poolToReset) {
    return
  }

  try {
    await poolToReset.end()
  } catch (error) {
    console.error(error)
  }
}

const isRetriableDatabaseError = (error: unknown) => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : ""
  const message = error instanceof Error ? error.message.toLowerCase() : ""

  return (
    code === "57014" ||
    code.startsWith("08") ||
    message.includes("timeout") ||
    message.includes("connection terminated") ||
    message.includes("connection ended") ||
    message.includes("socket closed")
  )
}

export const queryManualResultsDatabase = async <Row extends QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<Row>> => {
  try {
    return await getPool().query<Row>(text, values)
  } catch (error) {
    if (!isRetriableDatabaseError(error)) {
      throw error
    }

    await resetPool()
    return getPool().query<Row>(text, values)
  }
}
