import type { Bookmark } from "@smart/core";

/**
 * RichBookmark
 * ------------
 * Extends the core Bookmark with UI-specific fields.
 * These fields never go back to @smart/core.
 */
export type RichBookmark = Bookmark & {
  pinned?: boolean; // UI-only
};
