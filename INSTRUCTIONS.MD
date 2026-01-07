📚 Emperor — Developer Guide
Emperor is a cross‑platform knowledge library with Books, Pages, tagging, HTML importing, and a sync engine.
This monorepo contains:

packages/web — Vite + React frontend (runs on Bun)

packages/server — Fastify + Prisma backend (runs on Node)

packages/core — shared domain models, importer, tagging, and utilities

This guide explains how to install dependencies, run each package, and understand the development workflow.

🏗️ Monorepo Structure
Code
packages/
  core/      → shared domain models + importer + tagging
  server/    → Fastify backend + Prisma
  web/       → React frontend + Vite
The root uses pnpm workspaces to link everything together.

🚀 Prerequisites
You’ll need:

Node 18+

Bun (for frontend)

pnpm (for workspace installs)

PostgreSQL (local or Docker)

Install pnpm:

sh
npm install -g pnpm
Install Bun:

sh
curl -fsSL https://bun.sh/install | bash
📦 Install Dependencies
From the repo root:

sh
pnpm install
This installs:

root dependencies (React, Vite, TS, Tailwind)

backend dependencies (Fastify, Prisma)

frontend dependencies (DnD Kit, Heroicons)

core package dependencies

🗄️ Database Setup
1. Create a .env in packages/server
Code
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/emperor"
2. Run Prisma migrations
From the root:

sh
pnpm prisma:migrate
Generate Prisma client:

sh
pnpm prisma:generate
🖥️ Running the Backend (Node)
Backend lives in:

Code
packages/server
Start the server:

sh
cd packages/server
pnpm dev
This runs:

Fastify on http://localhost:4000

Prisma client

CORS enabled for the frontend

🌐 Running the Frontend (Bun + Vite)
Frontend lives in:

Code
packages/web
Start the dev server:

sh
cd packages/web
bun run dev
This runs Vite on:

Code
http://localhost:5173
🔁 Sync Engine (Current Behavior)
Right now the sync engine performs:

Pull sync on startup (initializeFromServer)

Pull sync on demand (syncWithServer)

Local optimistic CRUD

Merge logic for Books + Pages

Conflict resolution (local wins)

Backend endpoint:

Code
GET /api/sync?since=timestamp
🧪 Sync Debug Panel
To enable the Sync Debug Panel:

Add to packages/web/.env:

Code
VITE_DEBUG_SYNC=true
Restart Vite:

sh
bun run dev
The panel shows:

Sync status

Last sync time

Error messages

Change summary

Force Sync button

🧩 Core Package (@smart/core)
Shared domain logic lives in:

Code
packages/core
Exports include:

Bookmark model

Tag model

HTML importer

Auto‑tagger

Storage adapter

Import anywhere:

ts
import { Bookmark } from "@smart/core";
🐳 Docker (Optional)
If you want to run Postgres via Docker:

sh
docker compose up -d
Then run migrations:

sh
pnpm prisma:migrate
🧭 Common Commands
Install everything
sh
pnpm install
Backend
sh
cd packages/server
pnpm dev
Frontend
sh
cd packages/web
bun run dev
Prisma
sh
pnpm prisma:generate
pnpm prisma:migrate
Clean install
sh
rm -rf node_modules pnpm-lock.yaml
pnpm install
🛠️ Upcoming Features (Roadmap)
Push + Pull sync engine

/sync POST endpoint

Sync payload builder

Sync timeline in debug panel

Offline mode

Retry queue

Batch sync

Tagging engine integration

HTML importer UI