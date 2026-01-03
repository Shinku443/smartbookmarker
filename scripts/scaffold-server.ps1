# scaffold-server.ps1
$root = "packages/server"
$src = "$root/src"
$routes = "$src/routes"
$db = "$src/db"
$prisma = "$root/prisma"

# Create directories
New-Item -ItemType Directory -Path $routes -Force | Out-Null
New-Item -ItemType Directory -Path $db -Force | Out-Null
New-Item -ItemType Directory -Path $prisma -Force | Out-Null

# -----------------------------
# 1. index.ts
# -----------------------------
@"
import Fastify from "fastify";
import { config } from "./env";
import { registerSyncRoutes } from "./routes/sync";

const app = Fastify();

registerSyncRoutes(app);

app.listen({ port: config.PORT }, (err, address) => {
  if (err) throw err;
  console.log(\`🚀 Server listening at \${address}\`);
});
"@ | Set-Content "$src/index.ts"

# -----------------------------
# 2. env.ts
# -----------------------------
@"
import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  SCRAPFLY_KEY: process.env.SCRAPFLY_KEY || "",
  DATABASE_URL: process.env.DATABASE_URL || ""
};
"@ | Set-Content "$src/env.ts"

# -----------------------------
# 3. sync.ts
# -----------------------------
@"
import { FastifyInstance } from "fastify";
import { prisma } from "../db/client";

export function registerSyncRoutes(app: FastifyInstance) {
  app.get("/api/sync/pull", async (req, reply) => {
    reply.send({ status: "ok", data: [] });
  });

  app.post("/api/sync/push", async (req, reply) => {
    reply.send({ status: "ok" });
  });
}
"@ | Set-Content "$routes/sync.ts"

# -----------------------------
# 4. db/client.ts
# -----------------------------
@"
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
"@ | Set-Content "$db/client.ts"

# -----------------------------
# 5. Dockerfile
# -----------------------------
@"
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install
CMD ["bun", "run", "dev"]
"@ | Set-Content "$root/Dockerfile"

# -----------------------------
# 6. docker-compose.yml
# -----------------------------
@"
version: "3.9"
services:
  server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - SCRAPFLY_KEY=your-key-here
      - DATABASE_URL=postgresql://emperor:secret@db:5432/emperor?schema=public
    depends_on:
      - db

  db:
    image: postgres
    restart: always
    environment:
      POSTGRES_USER=emperor
      POSTGRES_PASSWORD=secret
      POSTGRES_DB=emperor
    ports:
      - "5432:5432"
"@ | Set-Content "$root/docker-compose.yml"

# -----------------------------
# 7. tsconfig.json
# -----------------------------
@"
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
"@ | Set-Content "$root/tsconfig.json"

# -----------------------------
# 8. package.json
# -----------------------------
@"
{
  "name": "emperor-server",
  "version": "0.1.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "fastify": "^4.0.0",
    "dotenv": "^16.0.0",
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0",
    "prisma": "^7.0.0"
  }
}
"@ | Set-Content "$root/package.json"

# -----------------------------
# 9. Prisma 7 schema.prisma
# -----------------------------
@"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
"@ | Set-Content "$prisma/schema.prisma"

# -----------------------------
# 10. Prisma 7 prisma.config.ts
# -----------------------------
@"
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    db: {
      url: process.env.DATABASE_URL!,
    },
  },
});
"@ | Set-Content "$prisma/prisma.config.ts"

# -----------------------------
# 11. Windows Prisma wrapper (prisma.ps1)
# -----------------------------
@"
# prisma.ps1
# Ensures Prisma runs inside packages/server so Bun resolves correctly

\$scriptDir = Split-Path -Parent \$MyInvocation.MyCommand.Definition
Set-Location \$scriptDir

bunx --cwd \$scriptDir prisma @Args
"@ | Set-Content "$root/prisma.ps1"