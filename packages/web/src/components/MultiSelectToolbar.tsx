import { Button } from "./ui/Button";

type Props = {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearAll: () => void;
  onDeleteSelected: () => void;
  onTagSelected: () => void;
};

export default function MultiSelectToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearAll,
  onDeleteSelected,
  onTagSelected
}: Props) {
  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between mb-4 bg-emperor-surfaceStrong border border-emperor-border rounded-card px-3 py-2">
      <div className="text-sm text-emperor-muted">
        {selectedCount > 0
          ? `${selectedCount} selected`
          : `${totalCount} bookmarks`}
      </div>

      <div className="flex gap-2">
        {selectedCount === 0 ? (
          <Button size="sm" variant="secondary" onClick={onSelectAll}>
            Select all
          </Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={onClearAll}>
              Clear
            </Button>
            <Button size="sm" variant="danger" onClick={onDeleteSelected}>
              Delete
            </Button>
            <Button size="sm" variant="primary" onClick={onTagSelected}>
              Tag
            </Button>
          </>
        )}
      </div>
    </div>
  );
}