# Emperor Architecture

A clear overview of Emperor’s current architecture and the planned evolution toward sync, extensions, and multi‑device support.

---

## 1. Overview

Emperor is currently a **local‑first, client‑side application** built with React + TypeScript.  
All data is stored in the browser using LocalStorage, and all logic runs entirely on the client.

A future version will introduce a backend for sync, multi‑device support, and collaboration.

---

## 2. Frontend Architecture

### 2.1 App.tsx

**Responsibilities:**
- Owns all global UI state:
  - Search query
  - Active tags
  - Active book
  - Modal visibility
  - Editing state
- Provides ordered, unfiltered lists:
  - `sortedByOrder` (main list)
  - `sortedPinned` (pinned section)
- Wires domain logic (useBookmarks) to UI components
- Renders:
  - Sidebar
  - PinnedBookmarks
  - BookmarkList
  - Modals

---

### 2.2 useBookmarks()

**Domain layer** for all bookmark and book operations.

**Responsibilities:**
- CRUD for bookmarks and books
- Ordering logic:
  - `rootOrder`
  - Book‑scoped `order` arrays
  - `pinnedOrder`
- Assign bookmarks to books
- Import HTML (Netscape format)
- Export JSON snapshot

This hook is the “source of truth” for Emperor’s data model.

---

### 2.3 Sidebar

**Responsibilities:**
- Search input
- Tag filters (multi‑select)
- Books list + active book selection
- Import/Export actions
- Settings + Book Manager entry points

The Sidebar is the primary navigation surface for Emperor.

---

### 2.4 BookmarkList

**Responsibilities:**
- Receives ordered, unfiltered list from App
- Applies filtering:
  - Fuzzy search (Fuse.js)
  - Multi‑tag filtering (OR logic)
  - Book context
- Handles drag‑and‑drop reordering
- Renders:
  - MultiSelectToolbar
  - BookmarkCard list
  - DragOverlay

BookmarkList is the “main canvas” of Emperor.

---

### 2.5 PinnedBookmarks

**Responsibilities:**
- Receives ordered, unfiltered pinned list
- Handles drag‑and‑drop within pinned subset
- Renders:
  - Section header
  - BookmarkCard list
  - DragOverlay

Pinned bookmarks have their own independent ordering system.

---

### 2.6 BookmarkCard

**Responsibilities:**
- Display:
  - Favicon
  - Title
  - URL
  - Tags
  - Book membership
- Actions:
  - Pin/unpin
  - Retag
  - Delete
  - Edit (inline or modal)
- Drag handle for DnD
- TagChip interactions

BookmarkCard is the atomic UI unit of Emperor.

---

### 2.7 Modals

- **EditBookmarkModal** — edit existing page  
- **AddBookmarkModal** — create new page  
- **BookManagerModal** — rename, reorder, delete books  
- **SettingsScreen** — theme + edit mode preferences  

Modals are rendered outside the main layout for clarity and accessibility.

---

## 3. Planned Backend Architecture (Sync)

A future version of Emperor will introduce a backend to support:

- Multi‑device sync
- Collaboration
- Cloud backups
- AI metadata extraction

### 3.1 Data Model (Planned)

Tables:
- `users`
- `books` (with optional `parent_book_id` for nesting)
- `bookmarks`
- `bookmark_order` (per book/root)
- `pinned_order`
- `tags`
- `bookmark_tags` (join table)

### 3.2 API Endpoints (Planned)

Core:
- `GET /library`
- `POST /bookmarks`
- `PUT /bookmarks/:id`
- `DELETE /bookmarks/:id`
- `POST /books`
- `PUT /books/:id`
- `DELETE /books/:id`
- `POST /orders/main`
- `POST /orders/pinned`
- `POST /tags/bulk`

Sync:
- `POST /sync/push`
- `GET /sync/pull`

### 3.3 Sync Model (Planned)

**v1 — Simple Sync**
- Client keeps local state
- On change:
  - Send patch to server
  - Receive updated objects
- Conflict resolution:
  - Last‑write‑wins for simple fields
  - Tags treated additively

**v2 — Versioned Sync**
- Each bookmark/book has:
  - `updated_at`
  - `version`
- Server merges changes intelligently

---

## 4. Docker Setup (Planned)

A future backend will use Docker for:

- API server (Node + TypeScript)
- Postgres database
- Optional Redis cache

A typical `docker-compose.yml` will define:
- `api` service
- `db` service
- Shared volume for persistent data

Difficulty:
- Docker setup: **easy**
- API design: **moderate**
- Sync logic: **complex but manageable**
- Full backend rollout: **1–3 weeks depending on scope**

---

## 5. Future Extensions

- Browser extension (Chrome/Firefox)
- Mobile app / PWA
- AI metadata extraction
- Smart digests
- Collaboration features

These will build on the backend once sync is available.

---