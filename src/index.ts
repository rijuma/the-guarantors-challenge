import { env } from './config/env.js'
import { buildApp } from './app.js'

async function main(): Promise<void> {
  const app = await buildApp({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  })

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    console.log(`Server listening on http://${env.HOST}:${env.PORT}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

main()
