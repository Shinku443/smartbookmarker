import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { TagChip } from "./ui/TagChip";
import { Input } from "./ui/Input";
import React, { useState } from "react";
import { RichBookmark } from "../hooks/useBookmarks";
import {
  StarIcon as StarOutline,
  StarIcon as StarSolid
} from "@heroicons/react/24/solid";
import { ClipboardIcon } from "@heroicons/react/24/outline";

type Props = {
  b: RichBookmark;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  editMode: "modal" | "inline";
  onEditRequest: (b: RichBookmark) => void;
  onSaveInline: (b: RichBookmark) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onRetag: (b: RichBookmark) => void;
  onTagClick: (tag: string) => void;
};

export default function BookmarkCard({
  b,
  selected,
  onToggleSelected,
  editMode,
  onEditRequest,
  onSaveInline,
  onDelete,
  onPin,
  onRetag,
  onTagClick
}: Props) {
  const [inlineTitle, setInlineTitle] = useState(b.title);
  const [inlineUrl, setInlineUrl] = useState(b.url);
  const [isEditingInline, setIsEditingInline] = useState(false);

  function startEdit() {
    if (editMode === "modal") {
      onEditRequest(b);
    } else {
      setIsEditingInline(true);
    }
  }

  function saveInline() {
    onSaveInline({
      ...b,
      title: inlineTitle,
      url: inlineUrl,
      updatedAt: Date.now()
    });
    setIsEditingInline(false);
  }

  function copyUrl() {
    navigator.clipboard.writeText(b.url);
  }

  return (
    <Card
      className={`
        border transition relative
        ${
          b.pinned
            ? "bg-blue-900/30 border-blue-400/30 shadow-[0_0_12px_rgba(0,0,255,0.25)]"
            : "bg-emperor-surface border-emperor-border"
        }
      `}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-3 flex-1">
          <input
            type="checkbox"
            className="mt-1"
            checked={selected}
            onChange={() => onToggleSelected(b.id)}
          />

          {b.faviconUrl && (
            <img src={b.faviconUrl} className="w-5 h-5 mt-1" />
          )}

          <div className="flex-1">
            {isEditingInline ? (
              <div className="space-y-2">
                <Input
                  value={inlineTitle}
                  onChange={(e) => setInlineTitle(e.target.value)}
                />
                <Input
                  value={inlineUrl}
                  onChange={(e) => setInlineUrl(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={saveInline}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setIsEditingInline(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  {b.title}
                </a>

                <div className="text-sm text-emperor-muted flex items-center gap-2">
                  {b.url}

                  {/* Copy URL button */}
                  <button
                    onClick={copyUrl}
                    className="opacity-0 group-hover:opacity-100 transition"
                  >
                    <ClipboardIcon className="w-4 h-4 text-emperor-muted hover:text-emperor-text" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {!isEditingInline && (
          <div className="flex items-center gap-3">
            {/* STAR PIN ICON */}
            <button
              onClick={() => onPin(b.id)}
              className="flex items-center justify-center hover:scale-110 transition"
            >
              {b.pinned ? (
                <StarSolid className="w-5 h-5 text-yellow-400" />
              ) : (
                <StarOutline className="w-5 h-5 text-emperor-muted" />
              )}
            </button>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="subtle" onClick={() => onRetag(b)}>
                Retag
              </Button>
              <Button size="sm" variant="subtle" onClick={startEdit}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(b.id)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* TAGS */}
      <div className="mt-3 flex flex-wrap gap-2">
        {b.tags?.map((t) => (
          <TagChip
            key={t.label}
            label={t.label}
            onClick={() => onTagClick(t.label)}
          />
        ))}
      </div>
    </Card>
  );
}