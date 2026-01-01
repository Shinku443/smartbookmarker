/**
 * ChangeIconModal.tsx
 * --------------------
 * Emperor's hybrid icon picker:
 *   - Curated categories (expanded + collapsible)
 *   - Recently used icons
 *   - Full emoji library (collapsible categories + subcategories)
 *   - Flags collapsed
 *   - CLDR metadata search (names + keywords + shortcodes)
 *   - Human-friendly labels
 *   - Inline emoji preview
 *   - Custom icon uploads
 *   - Recently used
 *   - CLDR search
 */
/**
 * ChangeIconModal.tsx — Updated (Block 1)
 * Modernized Emperor modal container
 * Inline emoji preview
 * Custom icon uploads
 * Recently used
 * CLDR search
 */

import React, { useState, useMemo } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { ICON_CATEGORIES } from "../../constants/iconCategories";
import { EMOJI_LIBRARY } from "../../constants/emojiLibrary";
import { EMOJI_METADATA } from "../../constants/emojiMetadata";

type Props = {
  onClose: () => void;
  onSelect: (emoji: string) => void;
  onDelete?: () => void;
};

export default function ChangeIconModal({ onClose, onSelect, onDelete }: Props) {
  /* ---------------------------------------------------------------------- */
  /* State                                                                  */
  /* ---------------------------------------------------------------------- */

  const [query, setQuery] = useState("");
  const [previewEmoji, setPreviewEmoji] = useState<string | null>(null);

  const [recent, setRecent] = useState<string[]>(
    JSON.parse(localStorage.getItem("recent-icons") || "[]")
  );

  const [customIcons, setCustomIcons] = useState<string[]>(
    JSON.parse(localStorage.getItem("custom-icons") || "[]")
  );

  const addRecent = (emoji: string) => {
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 20);
    setRecent(next);
    localStorage.setItem("recent-icons", JSON.stringify(next));
  };

  const handleSelect = (emoji: string) => {
    addRecent(emoji);
    onSelect(emoji);
  };

  /* ---------------------------------------------------------------------- */
  /* Upload Handler                                                         */
  /* ---------------------------------------------------------------------- */

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const next = [url, ...customIcons].slice(0, 50);
      setCustomIcons(next);
      localStorage.setItem("custom-icons", JSON.stringify(next));
    };
    reader.readAsDataURL(file);
  };

  /* ---------------------------------------------------------------------- */
  /* Search Logic (CLDR metadata + shortcodes)                              */
  /* ---------------------------------------------------------------------- */

  const searchLower = query.toLowerCase();

  const matchesQuery = (emoji: string) => {
    if (!searchLower) return true;

    const meta = EMOJI_METADATA[emoji];
    if (!meta) return false;

    return (
      meta.name.toLowerCase().includes(searchLower) ||
      meta.keywords.some((k) => k.includes(searchLower)) ||
      meta.shortcodes.some((s) => s.includes(searchLower))
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Filter curated categories                                              */
  /* ---------------------------------------------------------------------- */

  const filteredCurated = useMemo(() => {
    if (!query) return ICON_CATEGORIES;

    const result: Record<string, string[]> = {};

    for (const [label, icons] of Object.entries(ICON_CATEGORIES)) {
      const matches = icons.filter(matchesQuery);
      if (matches.length > 0) result[label] = matches;
    }

    return result;
  }, [query]);

  /* ---------------------------------------------------------------------- */
  /* Filter full emoji library                                              */
  /* ---------------------------------------------------------------------- */

  const filteredLibrary = useMemo(() => {
    if (!query) return EMOJI_LIBRARY;

    const result: typeof EMOJI_LIBRARY = {};

    for (const [category, subcats] of Object.entries(EMOJI_LIBRARY)) {
      const sub: Record<string, string[]> = {};

      for (const [subcat, icons] of Object.entries(subcats)) {
        const matches = icons.filter(matchesQuery);
        if (matches.length > 0) sub[subcat] = matches;
      }

      if (Object.keys(sub).length > 0) result[category] = sub;
    }

    return result;
  }, [query]);

  /* ---------------------------------------------------------------------- */
  /* Modernized Emperor Modal Container                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-[99999] bg-emperor-backdrop/80 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[520px] max-h-[80vh] overflow-y-auto rounded-xl bg-emperor-surface shadow-2xl border border-emperor-border p-4">

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            className="flex-1 px-3 py-2 rounded-card bg-emperor-surfaceStrong text-sm outline-none"
          />

          <label className="px-3 py-2 text-sm rounded-card bg-emperor-surfaceStrong cursor-pointer">
            Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </label>

          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 text-sm rounded-card bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-emperor-surfaceStrong"
          >
            <XMarkIcon className="w-5 h-5 text-emperor-muted" />
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Custom Icons (Uploaded by User)                                   */}
        {/* ------------------------------------------------------------------ */}
        {customIcons.length > 0 && (
          <div className="mb-4">
            <details open>
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Custom Icons
              </summary>

              <div className="grid grid-cols-8 gap-2">
                {customIcons.map((url) => (
                  <button
                    key={url}
                    onClick={() => handleSelect(url)}
                    onMouseEnter={() => setPreviewEmoji(url)}
                    onMouseLeave={() => setPreviewEmoji(null)}
                    className="p-2 rounded hover:bg-emperor-surfaceStrong"
                  >
                    <img
                      src={url}
                      className="w-6 h-6 object-contain"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Recently Used                                                      */}
        {/* ------------------------------------------------------------------ */}
        {recent.length > 0 && (
          <div className="mb-4">
            <details open>
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Recently Used
              </summary>

              <div className="grid grid-cols-8 gap-2">
                {recent.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    onMouseEnter={() => setPreviewEmoji(emoji)}
                    onMouseLeave={() => setPreviewEmoji(null)}
                    className="text-xl p-2 rounded hover:bg-emperor-surfaceStrong"
                  >
                    {emoji.startsWith("data:") || emoji.startsWith("blob:") ? (
                      <img
                        src={emoji}
                        className="w-6 h-6 object-contain"
                        draggable={false}
                      />
                    ) : (
                      emoji
                    )}
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Curated Categories                                                 */}
        {/* ------------------------------------------------------------------ */}
        {Object.entries(filteredCurated).map(([label, icons]) => (
          <div key={label} className="mb-4">
            <details open>
              <summary className="cursor-pointer text-sm font-medium mb-2">
                {label}
              </summary>

              <div className="grid grid-cols-8 gap-2">
                {icons.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    onMouseEnter={() => setPreviewEmoji(emoji)}
                    onMouseLeave={() => setPreviewEmoji(null)}
                    className="text-xl p-2 rounded hover:bg-emperor-surfaceStrong"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </details>
          </div>
        ))}

        {/* Divider */}
        <div className="my-4 border-t border-emperor-border opacity-60" />
        {/* ------------------------------------------------------------------ */}
        {/* Full Emoji Library                                                 */}
        {/* ------------------------------------------------------------------ */}
        {Object.entries(filteredLibrary).map(([category, subcats]) => (
          <div key={category} className="mb-4">
            <details>
              <summary className="cursor-pointer text-sm font-semibold mb-2">
                {category}
              </summary>

              <div className="pl-4">
                {Object.entries(subcats).map(([subcat, icons]) => (
                  <details key={subcat} className="mb-2">
                    <summary className="cursor-pointer text-sm mb-1">
                      {subcat}
                    </summary>

                    <div className="grid grid-cols-8 gap-2 mt-1">
                      {icons.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleSelect(emoji)}
                          onMouseEnter={() => setPreviewEmoji(emoji)}
                          onMouseLeave={() => setPreviewEmoji(null)}
                          className="text-xl p-2 rounded hover:bg-emperor-surfaceStrong"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          </div>
        ))}

      </div>
    </div>
  );
}