# Emperor Bookmarking - AI Coding Guidelines

## Architecture Overview
This is a TypeScript monorepo for cross-platform bookmarking with shared core logic. All business logic lives in `@smart/core` - platforms implement storage adapters and UI layers.

**Key Packages:**
- `core/`: Shared models, tagging, importing, storage interfaces
- `web/`: React web app with localStorage persistence
- `extension/`: Chrome extension with background/popup scripts
- `mobile/`: Expo React Native app
- `api/`: Elysia backend with Prisma/PostgreSQL
- `cli/`: Command-line tool for import/export/sync

## Core Principles
- **One Source of Truth**: All logic in `@smart/core`, platforms stay thin
- **AI-Ready Design**: Tagging prioritizes AI, falls back to heuristics
- **Storage Adapters**: Dumb persistence layer, no business logic
- **UI Extensions**: Platforms extend core models with UI-only fields (e.g., `RichBookmark` adds `pinned`)

## Development Workflows
- **Install**: `pnpm install` from root (uses workspaces)
- **Web Dev**: `cd packages/web && bunx vite` (runs at http://localhost:5173)
- **Extension Build**: `cd packages/extension && vite build` then load unpacked in Chrome
- **API Dev**: `docker-compose up` (starts Postgres + Elysia API at :4000)
- **Code Gen**: Use PowerShell scripts like `.\generate-component.ps1 -Name MyComponent`

## Code Patterns
- **Imports**: Use `@smart/core` alias for shared code
- **Models**: Core `Bookmark` interface; platforms extend with UI fields
- **Tagging**: Call `generateTags()` - tries AI first, falls back to heuristics
- **Storage**: Implement `StorageAdapter` interface per platform
- **HTML Import**: Use `importBookmarksFromHtml()` with DOMParser
- **Styling**: Tailwind with `emperor-` prefixed custom classes
- **Drag & Drop**: Use `@dnd-kit` for reordering (see `useBookmarks` hook)

## File Structure Conventions
- **Hooks**: Business logic in `useBookmarks.ts`, UI state in components
- **Storage**: Dumb adapters in `storage/` (e.g., `webStorage.ts`)
- **Models**: Core types in `core/src/models/`, platform extensions in `src/models/`
- **Components**: UI primitives in `ui/`, complex components in root `components/`

## Examples
- **Adding Bookmark**: Use `generateTags()` for auto-tagging, save via storage adapter
- **Import Flow**: Parse HTML with `DOMParser`, create `Bookmark[]` with `source: "imported"`
- **Persistence**: Load/save full `PersistedData` object, handle migrations gracefully
- **Extension**: Background script captures tabs, popup shows UI, both use core logic

## Gotchas
- **Project References**: Build order matters - core first, then dependents
- **Storage Corruption**: Always provide defaults in load functions
- **AI Tagging**: Currently stubbed - returns null, falls back to heuristics
- **Theme Classes**: Use `emperor-text`, `emperor-surfaceStrong`, etc.
- **CLI Commands**: Interact with API via `apiGet()` helper