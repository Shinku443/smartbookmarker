import { useEffect, useMemo, useState } from "react";
import { Bookmark, generateTags, importBookmarksFromHtml } from "@smart/core";
import { loadBookmarks, saveBookmarks } from "../storage/webStorage";

type RichBookmark = Bookmark & {
  pinned?: boolean;
};

type EditState = {
  id: string;
  title: string;
  url: string;
} | null;

export default function App() {
  const [bookmarks, setBookmarks] = useState<RichBookmark[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    loadBookmarks().then((loaded) => {
      setBookmarks(loaded as RichBookmark[]);
    });
  }, []);

  // -- Helpers --------------------------------------------------------------

  function persist(next: RichBookmark[]) {
    setBookmarks(next);
    saveBookmarks(next);
  }

  function computeFavicon(url: string) {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=${url}`;
    }
  }

  // -- Derived view state ---------------------------------------------------

  const filteredBookmarks = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = bookmarks;

    if (q) {
      result = result.filter((b) => {
        const inTitle = b.title.toLowerCase().includes(q);
        const inUrl = b.url.toLowerCase().includes(q);
        const inTags = b.tags?.some((t) => t.label.toLowerCase().includes(q));
        return inTitle || inUrl || inTags;
      });
    }

    if (activeTag) {
      result = result.filter((b) =>
        b.tags?.some((t) => t.label === activeTag)
      );
    }

    // Pinned first, then newest first
    return [...result].sort((a, b) => {
      const pinnedA = a.pinned ? 1 : 0;
      const pinnedB = b.pinned ? 1 : 0;
      if (pinnedA !== pinnedB) return pinnedB - pinnedA;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
  }, [bookmarks, search, activeTag]);

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookmarks) {
      for (const t of b.tags ?? []) {
        map.set(t.label, (map.get(t.label) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);
  }, [bookmarks]);

  // -- Actions --------------------------------------------------------------

  async function handleAddBookmark() {
    if (!title.trim() || !url.trim()) return;

    const autoTags = await generateTags(title, url);

    const now = Date.now();
    const newBookmark: RichBookmark = {
      id: crypto.randomUUID(),
      title: title.trim(),
      url: url.trim(),
      createdAt: now,
      updatedAt: now,
      faviconUrl: computeFavicon(url),
      tags: autoTags.map((label) => ({ label, type: "auto" })),
      source: "manual",
      pinned: false
    };

    const next = [...bookmarks, newBookmark];
    persist(next);

    setTitle("");
    setUrl("");
  }

  async function handleImportHtml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const imported = (await importBookmarksFromHtml(text)) as RichBookmark[];
      const next = [...bookmarks, ...imported];
      persist(next);
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  }

  function handleDelete(id: string) {
    const next = bookmarks.filter((b) => b.id !== id);
    persist(next);
  }

  function startEdit(b: RichBookmark) {
    setEditState({
      id: b.id,
      title: b.title,
      url: b.url
    });
  }

  function cancelEdit() {
    setEditState(null);
  }

  async function saveEdit() {
    if (!editState) return;
    const { id, title, url } = editState;
    if (!title.trim() || !url.trim()) return;

    const next = bookmarks.map((b) =>
      b.id === id
        ? {
            ...b,
            title: title.trim(),
            url: url.trim(),
            updatedAt: Date.now(),
            faviconUrl: computeFavicon(url)
          }
        : b
    );

    persist(next);
    setEditState(null);
  }

  function togglePin(id: string) {
    const next = bookmarks.map((b) =>
      b.id === id ? { ...b, pinned: !b.pinned } : b
    );
    persist(next);
  }

  async function retagWithAI(id: string) {
    const target = bookmarks.find((b) => b.id === id);
    if (!target) return;

    const autoTags = await generateTags(target.title, target.url);

    const next = bookmarks.map((b) =>
      b.id === id
        ? {
            ...b,
            tags: autoTags.map((label) => ({ label, type: "auto" })),
            updatedAt: Date.now()
          }
        : b
    );

    persist(next);
  }

  function handleExportJson() {
    setIsExporting(true);
    try {
      const data = JSON.stringify(bookmarks, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookmarks-emperor.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  // -- Render ---------------------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f7",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 24
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            alignSelf: "flex-start"
          }}
        >
          <h1 style={{ fontSize: "1.4rem", marginBottom: 8 }}>
            Emperor Bookmarking
          </h1>
          <p style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#555" }}>
            Cross‑platform, auto‑tagged bookmarks. This is the web workspace.
          </p>

          {/* Add bookmark */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Add bookmark</h2>
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                marginBottom: 6,
                borderRadius: 6,
                border: "1px solid #ddd",
                fontSize: "0.9rem"
              }}
            />
            <input
              placeholder="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                marginBottom: 8,
                borderRadius: 6,
                border: "1px solid #ddd",
                fontSize: "0.9rem"
              }}
            />
            <button
              onClick={handleAddBookmark}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background: "#111827",
                color: "#fff",
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              Add with auto‑tags
            </button>
          </div>

          {/* Import / Export */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Import / Export</h2>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: "0.85rem",
                color: "#333"
              }}
            >
              Import from browser HTML:
              <input
                type="file"
                accept=".html,.htm"
                onChange={handleImportHtml}
                style={{ display: "block", marginTop: 4, fontSize: "0.8rem" }}
                disabled={isImporting}
              />
            </label>
            <button
              onClick={handleExportJson}
              disabled={isExporting || bookmarks.length === 0}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: "0.9rem",
                cursor:
                  isExporting || bookmarks.length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity: isExporting || bookmarks.length === 0 ? 0.6 : 1
              }}
            >
              Export as JSON
            </button>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Search</h2>
            <input
              placeholder="Search title, URL, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #ddd",
                fontSize: "0.9rem"
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Tags</h2>
            <div style={{ marginBottom: 8 }}>
              <button
                onClick={() => setActiveTag(null)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "none",
                  marginRight: 6,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  background: activeTag === null ? "#111827" : "#e5e7eb",
                  color: activeTag === null ? "#fff" : "#111827"
                }}
              >
                All
              </button>
            </div>
            <div>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setActiveTag((current) => (current === tag ? null : tag))
                  }
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "none",
                    margin: "0 6px 6px 0",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    background:
                      activeTag === tag ? "#111827" : "#e5e7eb",
                    color: activeTag === tag ? "#fff" : "#111827"
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12
              }}
            >
              <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
                Bookmarks ({filteredBookmarks.length})
              </h2>
              {search || activeTag ? (
                <span style={{ fontSize: "0.8rem", color: "#555" }}>
                  Filtered view
                </span>
              ) : null}
            </div>

            {filteredBookmarks.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "#666" }}>
                No bookmarks yet. Add one from the sidebar or import from your
                browser.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {filteredBookmarks.map((b) => {
                  const isEditing = editState?.id === b.id;
                  return (
                    <li
                      key={b.id}
                      style={{
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: b.pinned ? "#fef3c7" : "#fff",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          justifyContent: "space-between"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            minWidth: 0
                          }}
                        >
                          <img
                            src={b.faviconUrl}
                            width={16}
                            height={16}
                            style={{ flexShrink: 0 }}
                          />
                          {isEditing ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                width: "100%"
                              }}
                            >
                              <input
                                value={editState!.title}
                                onChange={(e) =>
                                  setEditState((prev) =>
                                    prev
                                      ? { ...prev, title: e.target.value }
                                      : prev
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  border: "1px solid #ddd",
                                  fontSize: "0.9rem"
                                }}
                              />
                              <input
                                value={editState!.url}
                                onChange={(e) =>
                                  setEditState((prev) =>
                                    prev
                                      ? { ...prev, url: e.target.value }
                                      : prev
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  border: "1px solid #ddd",
                                  fontSize: "0.85rem"
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                                minWidth: 0
                              }}
                            >
                              <a
                                href={b.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontWeight: 600,
                                  fontSize: "0.95rem",
                                  color: "#111827",
                                  textDecoration: "none",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "420px"
                                }}
                              >
                                {b.title}
                              </a>
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#6b7280",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "420px"
                                }}
                              >
                                {b.url}
                              </span>
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexShrink: 0
                          }}
                        >
                          <button
                            onClick={() => togglePin(b.id)}
                            style={{
                              padding: "3px 6px",
                              borderRadius: 6,
                              border: "none",
                              background: b.pinned ? "#111827" : "#e5e7eb",
                              color: b.pinned ? "#fff" : "#111827",
                              fontSize: "0.75rem",
                              cursor: "pointer"
                            }}
                          >
                            {b.pinned ? "Unpin" : "Pin"}
                          </button>
                          <button
                            onClick={() => retagWithAI(b.id)}
                            style={{
                              padding: "3px 6px",
                              borderRadius: 6,
                              border: "none",
                              background: "#e0f2fe",
                              color: "#0f172a",
                              fontSize: "0.75rem",
                              cursor: "pointer"
                            }}
                          >
                            Retag
                          </button>
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveEdit}
                                style={{
                                  padding: "3px 6px",
                                  borderRadius: 6,
                                  border: "none",
                                  background: "#22c55e",
                                  color: "#fff",
                                  fontSize: "0.75rem",
                                  cursor: "pointer"
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                style={{
                                  padding: "3px 6px",
                                  borderRadius: 6,
                                  border: "none",
                                  background: "#e5e7eb",
                                  color: "#111827",
                                  fontSize: "0.75rem",
                                  cursor: "pointer"
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(b)}
                              style={{
                                padding: "3px 6px",
                                borderRadius: 6,
                                border: "none",
                                background: "#e5e7eb",
                                color: "#111827",
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(b.id)}
                            style={{
                              padding: "3px 6px",
                              borderRadius: 6,
                              border: "none",
                              background: "#fee2e2",
                              color: "#991b1b",
                              fontSize: "0.75rem",
                              cursor: "pointer"
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {b.tags && b.tags.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {b.tags.map((t) => (
                            <button
                              key={t.label}
                              onClick={() =>
                                setActiveTag((current) =>
                                  current === t.label ? null : t.label
                                )
                              }
                              style={{
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: 999,
                                border: "none",
                                margin: "2px 6px 0 0",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                background:
                                  activeTag === t.label
                                    ? "#111827"
                                    : "#e5e7eb",
                                color:
                                  activeTag === t.label ? "#fff" : "#111827"
                              }}
                            >
                              #{t.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}