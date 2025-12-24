/**
 * webStorage.ts
 * --------------
 * A minimal persistence adapter for Emperor.
 *
 * This module is intentionally "dumb":
 *   - It does NOT contain domain logic
 *   - It does NOT manipulate bookmarks or books
 *   - It does NOT know how ordering works
 *
 * It simply reads/writes JSON to localStorage.
 *
 * All business logic lives in:
 *   - useBookmarks.ts (domain logic)
 *   - models/ (domain types)
 */

import type { PersistedData } from "../models/PersistedData";

const STORAGE_KEY = "emperor_library";

/**
 * loadBookmarks()
 * ----------------
 * Loads the entire persisted library from localStorage.
 *
 * Returns:
 *   - PersistedData (bookmarks, books, ordering)
 *   - OR an empty structure if nothing is stored yet
 */
export async function loadBookmarks(): Promise<PersistedData> {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      bookmarks: [],
      books: [],
      rootOrder: [],
      pinnedOrder: []
    };
  }

  try {
    const parsed = JSON.parse(raw);

    // Ensure all fields exist even if older versions are missing them
    return {
      bookmarks: parsed.bookmarks ?? [],
      books: parsed.books ?? [],
      rootOrder: parsed.rootOrder ?? [],
      pinnedOrder: parsed.pinnedOrder ?? []
    };
  } catch {
    // If corrupted, reset storage
    return {
      bookmarks: [],
      books: [],
      rootOrder: [],
      pinnedOrder: []
    };
  }
}

/**
 * saveBookmarks()
 * ----------------
 * Persists the entire library to localStorage.
 *
 * Accepts:
 *   - PersistedData (bookmarks, books, ordering)
 *
 * Does NOT:
 *   - Validate data
 *   - Transform data
 *   - Apply business rules
 *
 * All of that belongs in useBookmarks().
 */
export async function saveBookmarks(data: PersistedData): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
