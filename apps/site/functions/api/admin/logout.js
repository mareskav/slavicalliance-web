import { clearSessionCookie, json } from "../../_lib/admin.js"

export const onRequestPost = async () => {
  return json(
    { authenticated: false },
    {
      headers: {
        "Set-Cookie": clearSessionCookie,
      },
    },
  )
}
