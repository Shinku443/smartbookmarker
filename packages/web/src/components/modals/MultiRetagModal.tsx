import React, { useState } from "react";
import { Button } from "../ui/Button";
import { TagInput } from "../ui/TagInput";
import type { RichBookmark } from "../../models/RichBookmark";
import type { BookmarkTag } from "@smart/core";
import {
  logBulkOperationStart,
  logBulkOperationCompletion,
  logBulkOperationFailure,
  bulkDebug,
  bulkVerbose
} from "../../sync/bulkLogger";

/**
 * MultiRetagModal.tsx
 * ------------------
 * Modal for editing tags on multiple bookmarks simultaneously.
 *
 * Features:
 *   - Tag input with chips
 *   - Shows count of bookmarks being tagged
 *   - Save/Cancel actions
 */

type Props = {
  /** Array of bookmarks being retagged */
  bookmarks: RichBookmark[];

  /** Callback to save the updated bookmarks */
  onSave: (updatedBookmarks: RichBookmark[]) => void;

  /** Callback to close the modal */
  onClose: () => void;
};

export default function MultiRetagModal({ bookmarks, onSave, onClose }: Props) {
  // Extract all unique tags from the selected bookmarks
  const allTags = new Set<string>();
  bookmarks.forEach(bookmark => {
    bookmark.tags?.forEach(tag => {
      allTags.add(tag.label);
    });
  });

  const [tags, setTags] = useState<string[]>(Array.from(allTags));

function handleSave() {
  try {
    logBulkOperationStart('multi-retag', bookmarks.length, 'MultiRetagModal');

    bulkDebug('Detailed bookmark information for retag operation', {
      bookmarkCount: bookmarks.length,
      sampleBookmarks: bookmarks.slice(0, 3).map(b => ({
        id: b.id,
        title: b.title,
        currentTags: b.tags?.map(t => t.label) || []
      }))
    });

    const newTagSet = new Set(tags.map(label => label.toLowerCase()));

    const updatedBookmarks = bookmarks.map(bookmark => {
      const filteredTags = bookmark.tags?.filter(tag =>
        newTagSet.has(tag.label.toLowerCase())
      ) || [];

      const newTags = tags
        .filter(tag => !bookmark.tags?.some(existingTag =>
          existingTag.label.toLowerCase() === tag.toLowerCase()
        ))
        .map(label => ({
          label,
          type: "user" as const
        }));

      bulkVerbose(`Updated tags for bookmark "${bookmark.title}" (ID: ${bookmark.id})`, {
        oldTags: bookmark.tags?.map(t => t.label) || [],
        newTags: [...filteredTags, ...newTags].map(t => t.label),
        tagCountChange: (bookmark.tags?.length || 0) - ([...filteredTags, ...newTags].length || 0)
      });

      return {
        ...bookmark,
        tags: [...filteredTags, ...newTags],
        updatedAt: Date.now()
      };
    });

    logBulkOperationCompletion('multi-retag', updatedBookmarks.length, bookmarks.length);
    onSave(updatedBookmarks);
    onClose();
  } catch (error) {
    logBulkOperationFailure('multi-retag', error as Error, {
      bookmarkCount: bookmarks.length,
      tagsBeingApplied: tags
    });
    onClose();
  }
}

return (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-emperor-surfaceStrong border border-emperor-border rounded-lg p-6 w-[420px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Edit Tags ({bookmarks.length} bookmarks)</h2>

        <div className="mb-4">
          <p className="text-sm text-emperor-muted mb-2">
            Applying tags to {bookmarks.length} selected bookmarks:
          </p>
          <ul className="text-sm text-emperor-muted list-disc list-inside max-h-32 overflow-y-auto">
            {bookmarks.slice(0, 5).map((bookmark, index) => (
              <li key={index} className="truncate">{bookmark.title}</li>
            ))}
            {bookmarks.length > 5 && (
              <li>...and {bookmarks.length - 5} more</li>
            )}
          </ul>
        </div>

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
