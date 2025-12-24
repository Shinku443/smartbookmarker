import BookmarkCard from "./BookmarkCard";
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
  onTagClick: (tag: string) => void;
};

export default function PinnedBookmarks({
  bookmarks,
  selectedIds,
  setSelectedIds,
  editMode,
  ...actions
}: Props) {
  const pinned = bookmarks.filter((b) => b.pinned);

  if (pinned.length === 0) return null;

  function toggleSelected(id: string) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">Pinned</h2>
      <ul className="space-y-4">
        {pinned.map((b) => (
          <li key={b.id}>
            <BookmarkCard
              b={b}
              selected={selectedIds.includes(b.id)}
              onToggleSelected={toggleSelected}
              editMode={editMode}
              {...actions}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}