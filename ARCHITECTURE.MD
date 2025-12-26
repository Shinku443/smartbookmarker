┌──────────────────────────────────────────────────────────────┐
│                          App.tsx                             │
│  - Global state: search, activeTags, activeBookId, modals     │
│  - Provides ordered, unfiltered lists                         │
│  - Wires all components + domain logic                        │
└───────────────┬──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│                        useBookmarks()                         │
│  - Domain layer                                               │
│  - Stores: bookmarks, books, rootOrder, pinnedOrder           │
│  - CRUD: add, delete, update, retag                           │
│  - Ordering: reorderBookPages, reorderPinned, reorderBooks    │
│  - Book assignment logic                                      │
└───────────────┬──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│                           Layout                              │
│  - Two‑pane layout                                             │
│  - Left: Sidebar                                               │
│  - Right: Main content                                         │
└───────────────┬──────────────────────────────────────────────┘
                │
                ├───────────────────────────────────────────────┐
                ▼                                               ▼
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│               Sidebar                │        │           PinnedBookmarks            │
│  - Search input                       │        │  - Independent pinned ordering       │
│  - Tag filters (multi‑select)         │        │  - Drag‑and‑drop                     │
│  - Books list + manager               │        │  - Uses BookmarkCard                 │
│  - Import/Export                      │        └──────────────────────────────────────┘
│  - Settings                           │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│                      BookmarkList                             │
│  - Receives ordered, unfiltered list                          │
│  - Applies filtering: search, tags, book                      │
│  - Drag‑and‑drop reordering                                   │
│  - Multi‑select toolbar                                       │
│  - Uses BookmarkCard                                          │
└──────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│                        BookmarkCard                           │
│  - Displays title, URL, favicon, tags                         │
│  - Inline or modal editing                                    │
│  - Pin/unpin, retag, delete                                   │
│  - Tag chips (clickable)                                      │
│  - Drag handle                                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                         Modals                                │
│  - AddBookmarkModal                                           │
│  - EditBookmarkModal                                          │
│  - BookManagerModal                                           │
│  - SettingsScreen                                             │
└──────────────────────────────────────────────────────────────┘