# Ensure we're in the repo root
Set-Location (Split-Path $MyInvocation.MyCommand.Path)

Write-Host "=== Scaffolding Emperor Backend (Fastify + Prisma + Postgres) ===" -ForegroundColor Cyan

$serverRoot = "packages/server"

# -------------------------------------------------------------------
# Folder structure
# -------------------------------------------------------------------
$folders = @(
  "$serverRoot",
  "$serverRoot/src",
  "$serverRoot/src/plugins",
  "$serverRoot/src/routes",
  "$serverRoot/src/domain",
  "$serverRoot/src/domain/books",
  "$serverRoot/src/domain/pages",
  "$serverRoot/src/domain/tags",
  "$serverRoot/src/domain/sync",
  "$serverRoot/src/utils",
  "$serverRoot/prisma"
)

foreach ($folder in $folders) {
  if (-not (Test-Path $folder)) {
    New-Item -ItemType Directory -Path $folder | Out-Null
    Write-Host "Created folder: $folder"
  }
}

# -------------------------------------------------------------------
# src/index.ts - Fastify entrypoint
# -------------------------------------------------------------------
$indexTs = @"
import Fastify from 'fastify'
import { prismaPlugin } from './plugins/prisma'
import booksRoutes from './routes/books'
import pagesRoutes from './routes/pages'
import tagsRoutes from './routes/tags'
import syncRoutes from './routes/sync'
import authRoutes from './routes/auth'

// Build the Fastify instance so tests and tooling can reuse it
export async function buildServer() {
  const app = Fastify({
    logger: true,
  })

  // Plugins
  app.register(prismaPlugin)

  // Routes
  app.register(authRoutes, { prefix: '/auth' })
  app.register(booksRoutes, { prefix: '/books' })
  app.register(pagesRoutes, { prefix: '/pages' })
  app.register(tagsRoutes, { prefix: '/tags' })
  app.register(syncRoutes, { prefix: '/sync' })

  return app
}

// If run directly: start the HTTP server
if (require.main === module) {
  ;(async () => {
    const app = await buildServer()
    try {
      await app.listen({ port: 4000, host: '0.0.0.0' })
      app.log.info('Emperor API running on http://localhost:4000')
    } catch (err) {
      app.log.error(err)
      process.exit(1)
    }
  })()
}
"@
Set-Content -Path "$serverRoot/src/index.ts" -Value $indexTs
Write-Host "Created: $serverRoot/src/index.ts"

# -------------------------------------------------------------------
# src/plugins/prisma.ts - Prisma Fastify plugin
# -------------------------------------------------------------------
$prismaPluginTs = @"
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prisma = new PrismaClient()

export const prismaPlugin = fp(async (app) => {
  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})
"@
Set-Content -Path "$serverRoot/src/plugins/prisma.ts" -Value $prismaPluginTs
Write-Host "Created: $serverRoot/src/plugins/prisma.ts"

# -------------------------------------------------------------------
# Route files
# -------------------------------------------------------------------
$routes = @{
  "books.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function booksRoutes(app: FastifyInstance) {
  // TODO: Replace with real Emperor books endpoints
  app.get('/', async () => {
    return { message: 'Books route working' }
  })
}
"@

  "pages.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function pagesRoutes(app: FastifyInstance) {
  // TODO: Replace with real Emperor pages endpoints
  app.get('/', async () => {
    return { message: 'Pages route working' }
  })
}
"@

  "tags.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function tagsRoutes(app: FastifyInstance) {
  // TODO: Replace with real Emperor tags endpoints
  app.get('/', async () => {
    return { message: 'Tags route working' }
  })
}
"@

  "sync.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function syncRoutes(app: FastifyInstance) {
  // TODO: Replace with real Emperor sync endpoints
  app.get('/status', async () => {
    return { status: 'ok' }
  })
}
"@

  "auth.ts" = @"
import { FastifyInstance } from 'fastify'

export default async function authRoutes(app: FastifyInstance) {
  // TODO: Replace with real auth (hashed passwords, proper tokens)
  app.post('/login', async () => {
    return { token: 'fake-token' }
  })
}
"@
}

foreach ($name in $routes.Keys) {
  $content = $routes[$name]
  Set-Content -Path "$serverRoot/src/routes/$name" -Value $content
  Write-Host "Created: $serverRoot/src/routes/$name"
}

# -------------------------------------------------------------------
# Utilities
# -------------------------------------------------------------------
$errorsTs = @"
export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}
"@
Set-Content -Path "$serverRoot/src/utils/errors.ts" -Value $errorsTs
Write-Host "Created: $serverRoot/src/utils/errors.ts"

$validationTs = @"
export function validate<T>(schema: any, data: unknown): T {
  // Placeholder for Zod or Fastify schema-based validation.
  // For now, this just returns the data as-is.
  return data as T
}
"@
Set-Content -Path "$serverRoot/src/utils/validation.ts" -Value $validationTs
Write-Host "Created: $serverRoot/src/utils/validation.ts"

# -------------------------------------------------------------------
# Domain placeholders
# -------------------------------------------------------------------
$domains = @("books", "pages", "tags", "sync")

foreach ($d in $domains) {
  $domainTs = @"
export function ${d}Service() {
  // Domain logic for $d will go here.
  // Keep this layer free of HTTP/web concerns.
}
"@
  $domainPath = "$serverRoot/src/domain/$d/service.ts"
  Set-Content -Path $domainPath -Value $domainTs
  Write-Host "Created: $domainPath"
}

# -------------------------------------------------------------------
# Prisma schema (Postgres, basic Emperor-ready skeleton)
# -------------------------------------------------------------------
$schemaPrisma = @"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // You can use env("DATABASE_URL") or override with --url in CLI.
  url      = env("DATABASE_URL")
}

// Emperor core models will be iterated later.
// Minimal example models based on your earlier API:

model User {
  id        String     @id @default(uuid())
  email     String     @unique
  password  String
  createdAt DateTime   @default(now())
  bookmarks Bookmark[]
}

model Bookmark {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String
  url       String
  tags      Json
  favicon   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
"@
Set-Content -Path "$serverRoot/prisma/schema.prisma" -Value $schemaPrisma
Write-Host "Created: $serverRoot/prisma/schema.prisma"

# -------------------------------------------------------------------
# Dockerfile for backend (Bun + Fastify)
# -------------------------------------------------------------------
$dockerfile = @"
FROM oven/bun:1

WORKDIR /app

# Copy root package + lockfile (monorepo-friendly; adjust if needed)
COPY package.json bun.lock* ./

# Install dependencies (Bun will respect workspaces if configured)
RUN bun install

# Copy everything (you can optimize this later)
COPY . .

EXPOSE 4000

CMD ["bun", "run", "packages/server/src/index.ts"]
"@
Set-Content -Path "$serverRoot/Dockerfile" -Value $dockerfile
Write-Host "Created: $serverRoot/Dockerfile"

# -------------------------------------------------------------------
# docker-compose.yml at repo root
# -------------------------------------------------------------------
$compose = @"
version: "3.9"

services:
  db:
    image: postgres:16
    container_name: emperor_db
    restart: always
    environment:
      POSTGRES_USER: emperor
      POSTGRES_PASSWORD: emperor_password
      POSTGRES_DB: emperor_bookmarks
    ports:
      - "5432:5432"
    volumes:
      - emperor_db_data:/var/lib/postgresql/data

  api:
    build: ./packages/server
    container_name: emperor_api
    restart: always
    environment:
      DATABASE_URL: postgresql://emperor:emperor_password@db:5432/emperor_bookmarks?schema=public
      JWT_SECRET: "super-secret-change-me"
    ports:
      - "4000:4000"
    depends_on:
      - db

volumes:
  emperor_db_data:
"@
Set-Content -Path "docker-compose.yml" -Value $compose
Write-Host "Created: docker-compose.yml"

Write-Host "`n=== Emperor Backend + Docker Scaffold Complete ===" -ForegroundColor Green