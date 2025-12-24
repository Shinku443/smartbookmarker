import { useState, useMemo } from "react";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import BookmarkList from "./components/BookmarkList";
import PinnedBookmarks from "./components/PinnedBookmarks";
import EditBookmarkModal from "./components/EditBookmarkModal";
import SettingsScreen from "./components/SettingsScreen";
import { useBookmarks, RichBookmark } from "./hooks/useBookmarks";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const {
    bookmarks,
    addBookmark,
    deleteBookmark,
    togglePin,
    retag,
    updateBookmark,
    importHtml
  } = useBookmarks();

  const { theme, setTheme } = useTheme();

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState<"modal" | "inline">("modal");
  const [editingBookmark, setEditingBookmark] =
    useState<RichBookmark | null>(null);

  // Collect all tags
  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookmarks) {
      for (const t of b.tags ?? []) {
        map.set(t.label, (map.get(t.label) ?? 0) + 1);
      }
    }
    return [...map.keys()];
  }, [bookmarks]);

  // Filter bookmarks by search + tag
  const filtered = useMemo(() => {
    let list = bookmarks;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.tags?.some((t) => t.label.toLowerCase().includes(q))
      );
    }

    if (activeTag) {
      list = list.filter((b) =>
        b.tags?.some((t) => t.label === activeTag)
      );
    }

    return list;
  }, [bookmarks, search, activeTag]);

  // Import bookmarks
  function handleImport(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(importHtml);
  }

  // Export bookmarks
  function handleExport() {
    const data = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookmarks.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Inline save
  function handleInlineSave(updated: RichBookmark) {
    updateBookmark(updated);
  }

  // Retag
  function handleRetag(b: RichBookmark, tag?: string) {
    const newTag = tag ?? prompt("Tag to apply?");
    if (!newTag) return;

    const updated: RichBookmark = {
      ...b,
      tags: [
        ...(b.tags ?? []),
        { label: newTag, type: "user" as const }
      ],
      updatedAt: Date.now()
    };

    retag(updated);
  }

  // Tag click from BookmarkCard
  function handleTagClick(tag: string) {
    setActiveTag(tag);
  }

  return (
    <>
      <Layout
        sidebar={
          <Sidebar
            onAdd={addBookmark}
            search={search}
            setSearch={setSearch}
            tags={tags}
            activeTag={activeTag}
            setActiveTag={setActiveTag}
            onImport={handleImport}
            onExport={handleExport}
            onOpenSettings={() => setShowSettings(true)}
          />
        }
      >
        {showSettings ? (
          <SettingsScreen
            theme={theme}
            setTheme={setTheme}
            editMode={editMode}
            setEditMode={setEditMode}
          />
        ) : (
          <>
            <PinnedBookmarks
              bookmarks={filtered}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              editMode={editMode}
              onDelete={deleteBookmark}
              onPin={togglePin}
              onRetag={handleRetag}
              onEditRequest={setEditingBookmark}
              onSaveInline={handleInlineSave}
              onTagClick={handleTagClick}
            />

            <BookmarkList
              bookmarks={filtered}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              editMode={editMode}
              onDelete={deleteBookmark}
              onPin={togglePin}
              onRetag={handleRetag}
              onEditRequest={setEditingBookmark}
              onSaveInline={handleInlineSave}
              onTagClick={handleTagClick}
            />
          </>
        )}
      </Layout>

      {editingBookmark && editMode === "modal" && (
        <EditBookmarkModal
          bookmark={editingBookmark}
          onSave={updateBookmark}
          onClose={() => setEditingBookmark(null)}
        />
      )}
    </>
  );
}