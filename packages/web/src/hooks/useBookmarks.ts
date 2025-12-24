import { useEffect, useState } from "react";
import {
  Bookmark,
  BookmarkTag,
  generateTags,
  importBookmarksFromHtml
} from "@smart/core";
import { loadBookmarks, saveBookmarks } from "../storage/webStorage";

export type RichBookmark = Bookmark & {
  pinned?: boolean;
  faviconUrl?: string;
};

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<RichBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookmarks().then((loaded) => {
      setBookmarks(loaded as RichBookmark[]);
      setLoading(false);
    });
  }, []);

  function persist(next: RichBookmark[]) {
    setBookmarks(next);
    saveBookmarks(next);
  }

  function computeFavicon(url: string) {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=${url}`;
    }
  }

  async function addBookmark(title: string, url: string) {
    const autoLabels = await generateTags(title, url);
    const now = Date.now();

    const autoTags: BookmarkTag[] = autoLabels.map((label) => ({
      label,
      // make sure this matches BookmarkTag["type"] from @smart/core
      type: "auto" as BookmarkTag["type"]
    }));

    const newBookmark: RichBookmark = {
      id: crypto.randomUUID(),
      title,
      url,
      createdAt: now,
      updatedAt: now,
      faviconUrl: computeFavicon(url),
      tags: autoTags,
      source: "manual",
      pinned: false
    };

    persist([...bookmarks, newBookmark]);
  }

  async function importHtml(text: string) {
    const imported = (await importBookmarksFromHtml(text)) as Bookmark[];
    // imported are plain Bookmark; treat them as RichBookmark (no pinned/fav yet)
    const withRich: RichBookmark[] = imported.map((b) => ({
      ...b,
      faviconUrl: b.faviconUrl ?? computeFavicon(b.url),
      pinned: (b as RichBookmark).pinned ?? false
    }));
    persist([...bookmarks, ...withRich]);
  }

  function deleteBookmark(id: string) {
    persist(bookmarks.filter((b) => b.id !== id));
  }

  function togglePin(id: string) {
    persist(
      bookmarks.map((b) =>
        b.id === id ? { ...b, pinned: !b.pinned } : b
      )
    );
  }

  async function retag(updated: RichBookmark) {
    const autoLabels = await generateTags(updated.title, updated.url);

    const autoTags: BookmarkTag[] = autoLabels.map((label) => ({
      label,
      type: "auto" as BookmarkTag["type"]
    }));

    const next: RichBookmark[] = bookmarks.map((b) =>
      b.id === updated.id
        ? {
            ...b,
            ...updated,
            tags: autoTags,
            updatedAt: Date.now()
          }
        : b
    );

    persist(next);
  }

  function updateBookmark(updated: RichBookmark) {
    const next: RichBookmark[] = bookmarks.map((b) =>
      b.id === updated.id
        ? {
            ...b,
            ...updated,
            updatedAt: Date.now(),
            faviconUrl: computeFavicon(updated.url)
          }
        : b
    );

    persist(next);
  }

  return {
    bookmarks,
    loading,
    addBookmark,
    deleteBookmark,
    togglePin,
    retag,
    updateBookmark,
    importHtml
  };
}