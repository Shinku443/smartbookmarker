import { Bookmark } from "@smart/core";

/**
 * webStorage.ts
 * -------------
 * Local storage abstraction for bookmark data persistence.
 * Provides async interface for loading and saving bookmarks to localStorage.
 * Uses JSON serialization for data storage and retrieval.
 */

const STORAGE_KEY = "bookmarks";

/**
 * loadBookmarks
 * -------------
 * Loads bookmark data from localStorage.
 * Returns empty array if no data exists or parsing fails.
 *
 * @returns Promise resolving to array of bookmarks
 */
export async function loadBookmarks(): Promise<Bookmark[]> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * saveBookmarks
 * -------------
 * Saves bookmark data to localStorage.
 * Serializes the bookmarks array as JSON for storage.
 *
 * @param bookmarks - Array of bookmarks to save
 * @returns Promise that resolves when save is complete
 */
export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}