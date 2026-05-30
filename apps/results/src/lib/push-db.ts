import { Pool } from "pg"

let pool: Pool | null = null

const getPool = () => {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) throw new Error("DATABASE_URL is missing for push-db.")
  pool ??= new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    query_timeout: 10000,
    statement_timeout: 10000
  })
  return pool
}

export type PushSubscriptionInput = {
  endpoint: string
  p256dh: string
  auth: string
  platform: string | null
  userAgent: string | null
  teamName: string | null
  notificationType: string
}

export type PushSubscriptionRecord = {
  endpoint: string
  p256dh: string
  auth: string
}

export const upsertPushSubscription = async (data: PushSubscriptionInput): Promise<void> => {
  await getPool().query(
    `
    INSERT INTO public.push_subscriptions
      (endpoint, p256dh, auth, platform, user_agent, team_name, notification_type, enabled)
    VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    ON CONFLICT (endpoint) DO UPDATE SET
      p256dh            = EXCLUDED.p256dh,
      auth              = EXCLUDED.auth,
      platform          = EXCLUDED.platform,
      user_agent        = EXCLUDED.user_agent,
      team_name         = EXCLUDED.team_name,
      notification_type = EXCLUDED.notification_type,
      enabled           = TRUE,
      updated_at        = NOW()
    `,
    [
      data.endpoint,
      data.p256dh,
      data.auth,
      data.platform,
      data.userAgent,
      data.teamName,
      data.notificationType
    ]
  )
}

export const disablePushSubscription = async (endpoint: string): Promise<void> => {
  await getPool().query(
    `UPDATE public.push_subscriptions SET enabled = FALSE, updated_at = NOW() WHERE endpoint = $1`,
    [endpoint]
  )
}

export const getEnabledSubscriptions = async (): Promise<PushSubscriptionRecord[]> => {
  const result = await getPool().query<PushSubscriptionRecord>(
    `SELECT endpoint, p256dh, auth FROM public.push_subscriptions WHERE enabled = TRUE`
  )
  return result.rows
}
