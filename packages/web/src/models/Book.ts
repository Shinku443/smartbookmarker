/**
 * Book
 * ----
 * A logical grouping of pages (bookmarks).
 * Each book maintains its own ordering array.
 */
export type Book = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  order?: string[]; // ordered list of page IDs
  parentBookId: string | null;
};
