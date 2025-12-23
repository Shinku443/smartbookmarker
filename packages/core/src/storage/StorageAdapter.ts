import { Bookmark } from "../models/Bookmark";

export interface StorageAdapter {
  loadBookmarks(): Promise<Bookmark[]>;
  saveBookmarks(bookmarks: Bookmark[]): Promise<void>;
}