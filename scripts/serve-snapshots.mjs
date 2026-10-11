// Serves ./.snapshots (written by `npm run publish:results:dry`) with CORS, as a
// local stand-in for https://data.slavicalliance.cz.
//   NEXT_PUBLIC_RESULTS_DATA_URL=http://localhost:4010
import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer } from "node:http"
import { dirname, join, normalize, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".snapshots")
const port = Number(process.env.PORT) || 4010

createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*")

  const path = normalize(decodeURIComponent(new URL(request.url, "http://localhost").pathname))
  const file = join(root, path)

  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    response.statusCode = 404
    response.end("Not found")
    return
  }

  response.setHeader("Content-Type", "application/json; charset=utf-8")
  createReadStream(file).pipe(response)
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`))
