import BookmarkCard from "./BookmarkCard";
import MultiSelectToolbar from "./MultiSelectToolbar";
import { RichBookmark } from "../hooks/useBookmarks";

type Props = {
  bookmarks: RichBookmark[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  editMode: "modal" | "inline";
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onRetag: (b: RichBookmark) => void;
  onEditRequest: (b: RichBookmark) => void;
  onSaveInline: (b: RichBookmark) => void;
  onTagClick: (tag: string) => void; // ⭐ NEW
};

export default function BookmarkList({
  bookmarks,
  selectedIds,
  setSelectedIds,
  editMode,
  ...actions
}: Props) {
  function toggleSelected(id: string) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  function selectAll() {
    setSelectedIds(bookmarks.map((b) => b.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function deleteSelected() {
    for (const id of selectedIds) {
      actions.onDelete(id);
    }
    setSelectedIds([]);
  }

  function tagSelected() {
    const tag = prompt("Tag to apply to selected bookmarks?");
    if (!tag) return;

    for (const b of bookmarks) {
      if (selectedIds.includes(b.id)) {
        actions.onRetag({
          ...b,
          tags: [...(b.tags ?? []), { label: tag, type: "user" as const }],
          updatedAt: Date.now()
        });
      }
    }
  }

  return (
    <div>
      <MultiSelectToolbar
        selectedCount={selectedIds.length}
        totalCount={bookmarks.length}
        onSelectAll={selectAll}
        onClearAll={clearAll}
        onDeleteSelected={deleteSelected}
        onTagSelected={tagSelected}
      />

      <ul className="space-y-4">
        {bookmarks.map((b) => (
          <li key={b.id}>
            <BookmarkCard
              b={b}
              selected={selectedIds.includes(b.id)}
              onToggleSelected={toggleSelected}
              editMode={editMode}
              {...actions} // ⭐ includes onTagClick automatically
            />
          </li>
        ))}
      </ul>
    </div>
  );
}