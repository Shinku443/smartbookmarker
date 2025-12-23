import { Bookmark } from "@smart/core";

const STORAGE_KEY = "bookmarks";

export async function loadBookmarks(): Promise<Bookmark[]> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}