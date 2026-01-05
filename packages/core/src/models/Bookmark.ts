export type TagType = "auto" | "user";

export interface BookmarkTag {
  label: string;
  type: TagType;
}

export type BookmarkStatus =
  | "active"      // Default active state
  | "favorite"    // User's favorite
  | "archive"     // Archived for later
  | "read_later"  // Want to read later
  | "review"      // Need to review/update
  | "broken";     // Link is broken

export interface Bookmark {
  id: string;
  bookId: string | null
  url: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;

  faviconUrl?: string;
  thumbnailUrl?: string;

  tags: BookmarkTag[];

  status?: BookmarkStatus;

  notes?: string; // Personal notes about the bookmark

  source: "manual" | "imported";

  rawMetadata?: any;
}
