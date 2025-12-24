import React, { useState } from "react";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import type { RichBookmark } from "../hooks/useBookmarks";

type Props = {
  bookmark: RichBookmark;
  onSave: (updated: RichBookmark) => void;
  onClose: () => void;
};

export default function EditBookmarkModal({ bookmark, onSave, onClose }: Props) {
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);

  // Convert tags → semicolon string
  const [tagString, setTagString] = useState(
    (bookmark.tags ?? []).map((t) => t.label).join("; ")
  );

  function save() {
    const parsedTags =
      tagString
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => ({
          label,
          type: "user" as const
        })) ?? [];

    const updated: RichBookmark = {
      ...bookmark,
      title,
      url,
      tags: parsedTags,
      updatedAt: Date.now()
    };

    onSave(updated);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-emperor-surfaceStrong p-6">
        <h2 className="text-lg font-semibold mb-4">Edit Bookmark</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tags (semicolon separated)
            </label>
            <Input
              value={tagString}
              onChange={(e) => setTagString(e.target.value)}
              placeholder="work; research; ai"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </Card>
    </div>
  );
}