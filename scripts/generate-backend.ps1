# Create folder structure
$paths = @(
  "packages/server/src",
  "packages/server/src/plugins",
  "packages/server/src/routes",
  "packages/server/src/domain",
  "packages/server/src/domain/books",
  "packages/server/src/domain/pages",
  "packages/server/src/domain/tags",
  "packages/server/src/domain/sync",
  "packages/server/src/utils",
  "packages/server/prisma"
)

foreach ($p in $paths) {
  New-Item -ItemType Directory -Force -Path $p | Out-Null
}

# Create core files with starter content
@"
import Fastify from 'fastify'
import { prismaPlugin } from './plugins/prisma'
import booksRoutes from './routes/books'
import pagesRoutes from './routes/pages'
import tagsRoutes from './routes/tags'
import syncRoutes from './routes/sync'
import authRoutes from './routes/auth'

export async function buildServer() {
  const app = Fastify({ logger: true })

  // Register plugins
  app.register(prismaPlugin)

  // Register routes
  app.register(authRoutes, { prefix: '/auth' })
  app.register(booksRoutes, { prefix: '/books' })
  app.register(pagesRoutes, { prefix: '/pages' })
  app.register(tagsRoutes, { prefix: '/tags' })
  app.register(syncRoutes, { prefix: '/sync' })

  return app
}

if (require.main === module) {
  buildServer().then(app => {
    app.listen({ port: 4000, host: '0.0.0.0' })
  })
}
"@ | Set-Content packages/server/src/index.ts

@"
import FastifyPlugin from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const prismaPlugin = FastifyPlugin(async (app) => {
  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})
"@ | Set-Content packages/server/src/plugins/prisma.ts

# Route files
$routes = @{
  "books.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function booksRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return { message: 'Books route working' }
  })
}
"@

  "pages.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function pagesRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return { message: 'Pages route working' }
  })
}
"@

  "tags.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function tagsRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return { message: 'Tags route working' }
  })
}
"@

  "sync.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function syncRoutes(app: FastifyInstance) {
  app.get('/status', async () => {
    return { status: 'ok' }
  })
}
"@

  "auth.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async () => {
    return { token: 'fake-token' }
  })
}
"@
}

foreach ($name in $routes.Keys) {
  $routes[$name] | Set-Content "packages/server/src/routes/$name"
}

# Utility files
@"
export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}
"@ | Set-Content packages/server/src/utils/errors.ts

@"
export function validate(schema: any, data: any) {
  // Placeholder for Zod or Fastify schema validation
  return data
}
"@ | Set-Content packages/server/src/utils/validation.ts

# Domain placeholders
$domains = @(
  "books",
  "pages",
  "tags",
  "sync"
)

foreach ($d in $domains) {
  @"
export function ${d}Service() {
  // Domain logic for $d will go here
}
"@ | Set-Content "packages/server/src/domain/$d/service.ts"
}

# Prisma schema placeholder
@"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

# Emperor schema will be added here
"@ | Set-Content packages/server/prisma/schema.prisma