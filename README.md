# 🦾 Emperor Bookmarking
A cross‑platform, AI‑ready bookmarking system built for speed, structure, and future expansion.
Emperor Bookmarking is a modern, multi‑platform bookmarking ecosystem designed to unify how users save, organize, tag, and explore their links across web, browser extension, and mobile environments.
The project is built as a TypeScript monorepo with a shared core library, ensuring consistent behavior and logic across every platform.
This is not “just another bookmark manager.”
It’s a foundation for intelligent link organization — auto‑tagging, AI‑powered metadata extraction, HTML bookmark importing, and seamless sync across devices.

🚀 Project Goals
- Provide a shared core engine for bookmark models, tagging, importing, and storage.
- Deliver a React web app for fast iteration and UI exploration.
- Build a Chrome extension for one‑click saving and tagging.
- Build a mobile app (Expo/React Native) for on‑the‑go access.
- Prepare the architecture for AI‑powered tagging, thumbnail generation, and future backend sync.

🧱 Monorepo Architecture
The project uses a clean, scalable monorepo structure:
EmperorBookmarking/
  package.json
  pnpm-workspace.yaml
  tsconfig.json

  packages/
    core/        → Shared logic (models, tagging, importer, storage)
    web/         → React + Vite web application
    extension/   → Chrome extension (React popup + background scripts)
    mobile/      → Expo React Native app


Each package is isolated but linked through workspace tooling, enabling:
✅ Shared TypeScript types
✅ Shared logic
✅ Zero duplication
✅ Easy future expansion

🧠 Core Package (@smart/core)
The core package is the heart of the system. It contains:
✅ Bookmark Model
A strongly typed structure for bookmarks, tags, metadata, and sources.
✅ Tagging Engine
- AI‑ready tagging layer
- Heuristic fallback rules
- Unified generateTags() API
✅ HTML Importer
Parses Chrome/Firefox bookmark export files and converts them into structured bookmarks.
✅ Storage Adapter Interface
A platform‑agnostic interface that each environment implements:
- Web → localStorage
- Extension → chrome.storage.local
- Mobile → AsyncStorage
- Future → Cloud sync adapter
✅ Utilities
Sorting, filtering, searching, and metadata helpers.

🌐 Web App (@smart/web)
A fast, modern React application built with Vite.
Features:
- Add bookmarks manually
- Auto‑tagging via core
- Import HTML bookmark files
- View, search, and filter bookmarks
- Local persistence via web storage adapter
Tech Stack:
- React 18
- TypeScript
- Vite
- Node types for tooling
- Alias imports from core
This app is the fastest way to iterate on UI/UX and test core logic.

🧩 Browser Extension (@smart/extension)
A Chrome extension powered by Vite bundling.
Components:
- Background script
- Popup UI (React, optional)
- Options page
- Manifest v3
Responsibilities:
- Capture the current tab
- Auto‑tag and save bookmarks
- Sync with core logic
- Provide a lightweight UI for quick access

📱 Mobile App (@smart/mobile)
A React Native + Expo application for mobile access.
Features (planned):
- View bookmarks
- Add bookmarks
- Tag management
- Sync with backend (future)
Tech Stack:
- Expo
- React Native
- TypeScript

🛠️ Tooling & Frameworks
✅ Languages & Core Tech
- TypeScript (strict mode)
- React (web + extension popup)
- React Native / Expo (mobile)
- Vite (web + extension bundling)
✅ Monorepo Tooling
- npm workspaces (or pnpm/yarn)
- Shared tsconfig references
- Alias imports for shared code
✅ Future Integrations
- AI tagging via backend service
- Thumbnail generation
- Cloud sync
- User accounts
- Multi-device history

🧭 Philosophy
Emperor Bookmarking is built around a few core principles:
1. One Source of Truth
All logic lives in @smart/core.
Every platform behaves identically.
2. Fast Iteration
The web app is the playground — build features once, then port them.
3. AI‑Ready by Design
Tagging, metadata extraction, and content analysis are structured for future AI integration.
4. Extensible Architecture
Adapters, models, and utilities are designed to grow without breaking.

------------------------------------------------------------------------------
# ✅ Setup & Installation
📦 Requirements
- Node.js 18+
- npm (or pnpm/yarn)
- VS Code recommended
- Chrome (for extension development)
- Expo CLI (for mobile development)
🛠️ Install dependencies
From the project root:
npm install


This installs dependencies for all workspace packages:
- packages/core
- packages/web
- packages/extension
- packages/mobile

✅ Development Workflow
🌐 Web App (React + Vite)
cd packages/web
npm run dev


Runs the web UI at:
http://localhost:5173


This is the fastest way to test core logic and UI changes.

🧩 Browser Extension (Chrome)
cd packages/extension
npm run build


Then load the extension:
- Open Chrome
- Go to chrome://extensions
- Enable Developer Mode
- Click Load unpacked
- Select packages/extension/dist

📱 Mobile App (Expo)
cd packages/mobile
npm start


Then open:
- iOS Simulator
- Android Emulator
- Expo Go app on your phone

✅ Project Structure Overview
EmperorBookmarking/
  package.json
  pnpm-workspace.yaml
  tsconfig.json

  packages/
    core/
      src/
        models/
        tagging/
        importer/
        storage/
        ai/
      index.ts

    web/
      src/
        App.tsx
        main.tsx
        storage/
      vite.config.ts

    extension/
      src/
        background.ts
        popup/
        options/
      manifest.json
      vite.config.ts

    mobile/
      App.tsx
      metro.config.js


✅ Core principles
- Shared logic lives in @smart/core
- Each platform implements its own storage adapter
- UI layers stay thin and declarative
- Tagging engine is AI‑ready
- Importer supports Chrome/Firefox HTML exports

✅ Roadmap
This is a living roadmap that reflects the project’s long‑term vision.
✅ Phase 1 — Core Foundations (in progress)
- ✅ Bookmark model
- ✅ Tagging engine (heuristics + AI stub)
- ✅ HTML importer
- ✅ Storage adapter interface
- ✅ Web app scaffolding
- ✅ Monorepo setup
✅ Phase 2 — Web App MVP
- Add bookmark UI
- Tag display + filtering
- Search
- HTML import UI
- Bookmark editing
- Local persistence
✅ Phase 3 — Chrome Extension MVP
- Background script
- Popup UI (React)
- Save current tab
- Auto‑tagging
- Sync with core logic
✅ Phase 4 — Mobile MVP
- Bookmark list
- Add bookmark
- Tag filtering
- Local persistence
✅ Phase 5 — AI & Sync
- AI tag generation via backend
- Thumbnail generation
- Cloud sync
- User accounts
- Multi‑device history

