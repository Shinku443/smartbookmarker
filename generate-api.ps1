# Ensure we're in the repo root
Set-Location (Split-Path $MyInvocation.MyCommand.Path)

Write-Host "=== Generating Emperor API Skeleton ===" -ForegroundColor Cyan

$apiRoot = "packages/api"

# Create folder structure
$folders = @(
    "$apiRoot",
    "$apiRoot/src",
    "$apiRoot/src/routes",
    "$apiRoot/prisma"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Created folder: $folder"
    }
}

# Create docker-compose.yml at root
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
    build: ./packages/api
    container_name: emperor_api
    restart: always
    environment:
      DATABASE_URL: postgres://emperor:emperor_password@db:5432/emperor_bookmarks
      JWT_SECRET: "super-secret-change-me"
    ports:
      - "4000:4000"
    depends_on:
      - db

volumes:
  emperor_db_data:
"@

Set-Content -Path "docker-compose.yml" -Value $compose
Write-Host "Created docker-compose.yml"

# Create Dockerfile
$dockerfile = @"
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

EXPOSE 4000
CMD ["bun", "run", "src/index.ts"]
"@

Set-Content -Path "$apiRoot/Dockerfile" -Value $dockerfile
Write-Host "Created Dockerfile"

# Create index.ts
$index = @"
import { Elysia } from "elysia";
import { bookmarks } from "./routes/bookmarks";
import { auth } from "./routes/auth";

const app = new Elysia()
  .use(auth)
  .use(bookmarks)
  .listen(4000);

console.log("API running on http://localhost:4000");
"@

Set-Content -Path "$apiRoot/src/index.ts" -Value $index
Write-Host "Created src/index.ts"

# Create db.ts
$db = @"
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();
"@

Set-Content -Path "$apiRoot/src/db.ts" -Value $db
Write-Host "Created src/db.ts"

# Create env.ts
$env = @"
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!
};
"@

Set-Content -Path "$apiRoot/src/env.ts" -Value $env
Write-Host "Created src/env.ts"

# Create auth.ts
$auth = @"
import { Elysia } from "elysia";
import { db } from "../db";
import jwt from "jsonwebtoken";

export const auth = new Elysia({ prefix: "/auth" })
  .post("/register", async ({ body }) => {
    const { email, password } = body;

    const user = await db.user.create({
      data: { email, password }
    });

    return user;
  })
  .post("/login", async ({ body }) => {
    const { email, password } = body;

    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.password !== password) return { error: "Invalid login" };

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);

    return { token };
  });
"@

Set-Content -Path "$apiRoot/src/routes/auth.ts" -Value $auth
Write-Host "Created src/routes/auth.ts"

# Create bookmarks.ts
$bookmarks = @"
import { Elysia } from "elysia";
import { db } from "../db";

export const bookmarks = new Elysia({ prefix: "/bookmarks" })
  .get("/", async () => {
    return db.bookmark.findMany();
  })
  .post("/", async ({ body }) => {
    return db.bookmark.create({ data: body });
  })
  .delete("/:id", async ({ params }) => {
    return db.bookmark.delete({ where: { id: params.id } });
  });
"@

Set-Content -Path "$apiRoot/src/routes/bookmarks.ts" -Value $bookmarks
Write-Host "Created src/routes/bookmarks.ts"

# Create Prisma schema
$schema = @"
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  createdAt DateTime  @default(now())
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

Set-Content -Path "$apiRoot/prisma/schema.prisma" -Value $schema
Write-Host "Created prisma/schema.prisma"

Write-Host "`n=== API Skeleton Generated Successfully ===" -ForegroundColor Green