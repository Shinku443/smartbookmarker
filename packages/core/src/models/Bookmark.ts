export type TagType = "auto" | "user";

export interface BookmarkTag {
  label: string;
  type: TagType;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;

  faviconUrl?: string;
  thumbnailUrl?: string;

  tags: BookmarkTag[];

  source: "manual" | "imported";

  rawMetadata?: any;
}