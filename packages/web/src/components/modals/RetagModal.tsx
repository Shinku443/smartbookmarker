import React, { useState } from "react";
import { Button } from "../ui/Button";
import { TagInput } from "../ui/TagInput";
import type { RichBookmark } from "../../models/RichBookmark";
import type { BookmarkTag } from "@smart/core";

/**
 * RetagModal.tsx
 * --------------
 * Simple modal for editing tags on an existing bookmark.
 *
 * Features:
 *   - Tag input with chips
 *   - Save/Cancel actions
 */

type Props = {
  /** Bookmark being retagged */
  bookmark: RichBookmark;

  /** Callback to save the updated bookmark */
  onSave: (updatedBookmark: RichBookmark) => void;

  /** Callback to close the modal */
  onClose: () => void;
};

export default function RetagModal({ bookmark, onSave, onClose }: Props) {
  const [tags, setTags] = useState<string[]>(
    bookmark.tags?.map(t => t.label) || []
  );

  function handleSave() {
    const bookmarkTags: BookmarkTag[] = tags.map(label => ({
      label,
      type: "user" as const
    }));

    const updatedBookmark: RichBookmark = {
      ...bookmark,
      tags: bookmarkTags,
      updatedAt: Date.now()
    };

    onSave(updatedBookmark);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-emperor-surfaceStrong border border-emperor-border rounded-lg p-6 w-[420px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Edit Tags</h2>

        <p className="text-sm text-emperor-muted mb-4">
          {bookmark.title}
        </p>

        {/* Tags */}
        <div className="mb-6">
          <label className="text-sm text-emperor-muted mb-2 block">Tags</label>
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="Add or edit tags"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={handleSave}>
            Save Tags
          </Button>
        </div>
      </div>
    </div>
  );
}