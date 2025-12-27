# Emperor Roadmap

This roadmap describes where Emperor Library is heading. It’s opinionated by design.

## Phase 1 – Deepen Core Library (0–4 weeks)

**Goals:**
- Make Emperor the best personal bookmarking/knowledge library for solo use.
- Zero friction, high power.

### Features

**Nested Books (folders inside folders)**  
- Hierarchical tree in Sidebar.  
- Drag‑and‑drop to nest/un‑nest books.  
- Breadcrumb navigation above BookmarkList.  
- Visual cues for depth (indentation, subtle lines).

**Smart Collections (saved filters)**  
- “Smart Collections” section in Sidebar.  
- Define queries using:
  - Tags (AND/OR)
  - Pinned state
  - Book scope
  - Domain (e.g. `youtube.com`)
  - Date added (e.g. last 7 days)
- Auto‑updating; no manual maintenance.

**Bulk Tag Editor**  
- Multi‑select toolbar → “Edit tags”.  
- Modal supporting:
  - Add tags to all selected
  - Remove tags
  - Replace tag A → B
- Show how many pages will be affected before applying.

**Keyboard Shortcuts**  
- `/` → focus search  
- `A` → open Add Page  
- `Cmd/Ctrl + K` → open Command Palette (when implemented)  
- `↑ / ↓` → navigate list  
- `Space` → toggle selection  
- `Enter` → open selected page  

---

## Phase 2 – Power Workflows & Discovery (4–10 weeks)

**Goals:**
- Make Emperor the “fast brain” for your web knowledge.
- Shorten the distance between “idea” and “found it”.

### Features

**Command Palette**  
- `Cmd/Ctrl + K` to open.  
- Search across:
  - Pages (title, URL, tags)
  - Books
  - Smart Collections
  - Actions (“Add page”, “Move to book: X”)
- Quick actions:
  - Open
  - Pin
  - Move
  - Edit

**Preview Images (OpenGraph) + Grid View**  
- Fetch OG image + description on add.  
- Optional thumbnail in BookmarkCard.  
- Toggle between:
  - Compact list view
  - Visual grid view

**Refined BookmarkCard Layout**  
- Domain extraction and display.  
- Optional description/notes.  
- Clear visual hierarchy between title, URL, metadata.  

**Full‑Text Search (local index)**  
- MiniSearch/Lunr index in the client.  
- Search title, URL, tags, description, notes.  
- Highlight matches in UI.

---

## Phase 3 – Sync & Ecosystem (10–20 weeks)

**Goals:**
- Multi‑device usage.
- Stable sync.
- Real‑world usage at scale.

### Features

**Sync Engine (local‑first)**  
- Local IndexedDB store + in‑memory state.  
- Backend (Node/TypeScript + Postgres, or Supabase).  
- Auth (email/password or OAuth later).  
- Conflict resolution:
  - Last‑write‑wins for simple fields
  - Append‑only for tags

**Browser Extension**  
- Quick “Save to Emperor” from the toolbar.  
- Choose book, tags, pinned state.  
- Optional: save raw article HTML for future parsing.

**Mobile Web / PWA**  
- Fully responsive UI.  
- Installable PWA.  
- Optimized for capture‑first workflows.

---

## Phase 4 – AI‑Enhanced Library (20+ weeks)

**Goals:**
- Make Emperor feel like a second brain, not just a bookmark manager.

### Features

**AI Metadata Extraction**  
- On add:
  - Generate tags
  - Summary
  - Key points
  - Suggested book
- Optional: bulk “Enrich existing library” job.

**Smart Recaps & Digests**  
- Weekly “What did I save?” emails or in‑app views.  
- Thematic clusters by topic.  
- Suggested tags and Smart Collections.

**Sharing & Collaboration**  
- Share a book or Smart Collection:  
  - Public read‑only link  
  - Invite collaborators with scoped permissions  

---

## Prioritization Snapshot

Short‑term priorities:
- Nested Books  
- Bulk Tag Editor  
- Keyboard Shortcuts  
- Command Palette (MVP)  