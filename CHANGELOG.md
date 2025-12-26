# Changelog
All notable changes to Emperor Library will be documented in this file.

## [Unreleased]
- Planned: Nested books
- Planned: Sync engine + conflict resolution
- Planned: AI metadata extraction
- Planned: Command palette
- Planned: Animated transitions for book switching and tag filtering

---

## [1.6.0] – 2025-12-25
### Added
- Full multi‑tag filtering system (OR logic) across Sidebar, BookmarkList, BookmarkCard, and PinnedBookmarks
- Fuzzy search (Fuse.js) integrated into BookmarkList
- DragOverlay support for smooth drag‑and‑drop interactions
- Complete documentation pass across all major components (Sidebar, BookmarkList, BookmarkCard, PinnedBookmarks, App)
- Active tag highlighting in BookmarkCard
- Unified comment style with section headers and architecture notes
- BookManagerModal now displays page counts per book

### Changed
- Filtering moved entirely inside BookmarkList to preserve global ordering integrity
- PinnedBookmarks refactored to support independent pinned ordering
- Sidebar updated to support multi‑tag selection instead of single‑tag mode
- App.tsx updated to pass new props (`search`, `activeTags`, `activeBookId`)
- Improved ordering logic for both root and book contexts
- Improved pinned ordering logic to handle missing IDs gracefully

### Fixed
- Crash caused by missing `search` prop in BookmarkList
- Crash caused by missing `activeTags` in PinnedBookmarks
- Fuse.js implicit `any` typing issue
- DragOverlay rendering inconsistencies

---

## [1.5.0] – 2025-12-22
### Added
- Book Manager modal (rename, reorder, delete books)
- Inline editing mode for bookmarks
- Settings screen with theme + edit mode preferences
- Add Page modal with book assignment
- Favicon support for bookmarks

### Changed
- BookmarkCard redesigned for clarity and compactness
- Improved spacing, typography, and hover states across UI
- Updated theme system with CSS variables and Tailwind integration

---

## [1.4.0] – 2025-12-18
### Added
- Pinned bookmarks section with independent ordering
- Multi‑select toolbar (delete, tag, pin, unpin, move to book)
- Drag‑and‑drop reordering for pinned bookmarks

### Changed
- BookmarkCard updated to support selection checkboxes
- Improved drag handles and visual feedback

---

## [1.3.0] – 2025-12-15
### Added
- Books (groups) system
- Book‑scoped ordering arrays
- Book switching in Sidebar
- “Move to Book” action for bookmarks

### Changed
- App ordering logic updated to support book contexts
- Sidebar updated with Books section and “Manage Books” button

---

## [1.2.0] – 2025-12-10
### Added
- Import HTML (Netscape bookmarks) support
- Export JSON support
- Basic tag filtering (single tag)

### Changed
- Sidebar updated with Import/Export section
- BookmarkCard updated to display tags

---

## [1.1.0] – 2025-12-05
### Added
- Drag‑and‑drop reordering for main bookmark list
- SortableContext integration
- DragOverlay prototype

### Changed
- BookmarkCard updated with drag handle
- Improved list spacing and card styling

---

## [1.0.0] – 2025-12-01
### Added
- Initial Emperor Library MVP
- Add bookmark modal
- Edit bookmark modal
- Basic Sidebar with search
- Basic tag display
- Basic theme system
- LocalStorage persistence