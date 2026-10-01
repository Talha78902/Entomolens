import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const env = loadEnv('development', process.cwd(), '')
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) process.env[key] = value
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

function mockApiResponse(res: ServerResponse) {
  const json = (body: unknown): void => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  }
  return {
    status: (code: number) => {
      res.statusCode = code
      return { json }
    },
    json,
  }
}

function devApiPlugin(): Plugin {
  return {
    name: 'entomolens-dev-api',
    configureServer(devServer) {
      devServer.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0]
        const match = pathname.match(/^\/api\/(identify|assistant|damage)$/)
        if (!match) return next()
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ error: 'Method not allowed' }))
        }
        try {
          const mod = await devServer.ssrLoadModule(`/api/${match[1]}.ts`)
          const handler = (mod as { default?: unknown }).default
          if (typeof handler !== 'function') throw new Error('API handler not found')
          const body = await readBody(req)
          const query = Object.fromEntries(new URL(req.url ?? '/', 'http://localhost').searchParams)
          // Node defines IncomingMessage#headers as a lazy prototype getter, so
          // spreading `req` silently drops it and handlers that read
          // req.headers (e.g. the content-length guard) see undefined. Copy the
          // fields the handlers actually use onto the VercelRequest shape.
          const emulateReq = {
            method: req.method,
            headers: req.headers,
            url: req.url,
            body,
            query,
          }
          await (handler as (req: unknown, res: unknown) => Promise<unknown> | unknown)(
            emulateReq as never,
            mockApiResponse(res) as never,
          )
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Unexpected error',
            }),
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})