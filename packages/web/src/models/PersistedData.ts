import type { RichBookmark } from "./RichBookmark";
import type { Book } from "./Book";

/**
 * PersistedData
 * -------------
 * The full shape of what we store in localStorage.
 * This is the single source of truth for persistence.
 */
export type PersistedData = {
  bookmarks: RichBookmark[];
  books: Book[];
  rootOrder: string[];
  pinnedOrder: string[];
};
