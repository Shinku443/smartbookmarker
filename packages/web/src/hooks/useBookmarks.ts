import { useEffect, useState } from "react";
import { Bookmark, generateTags, importBookmarksFromHtml } from "@smart/core";
import { loadBookmarks, saveBookmarks } from "../storage/webStorage";

export type RichBookmark = Bookmark & {
  pinned?: boolean;
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
    const autoTags = await generateTags(title, url);
    const now = Date.now();

    const newBookmark: RichBookmark = {
      id: crypto.randomUUID(),
      title,
      url,
      createdAt: now,
      updatedAt: now,
      faviconUrl: computeFavicon(url),
      tags: autoTags.map((label) => ({ label, type: "auto" })),
      source: "manual",
      pinned: false
    };

    persist([...bookmarks, newBookmark]);
  }

  async function importHtml(text: string) {
    const imported = (await importBookmarksFromHtml(text)) as RichBookmark[];
    persist([...bookmarks, ...imported]);
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

  async function retag(id: string) {
    const target = bookmarks.find((b) => b.id === id);
    if (!target) return;

    const autoTags = await generateTags(target.title, target.url);

    persist(
      bookmarks.map((b) =>
        b.id === id
          ? {
              ...b,
              tags: autoTags.map((label) => ({ label, type: "auto" })),
              updatedAt: Date.now()
            }
          : b
      )
    );
  }

  function updateBookmark(id: string, title: string, url: string) {
    persist(
      bookmarks.map((b) =>
        b.id === id
          ? {
              ...b,
              title,
              url,
              updatedAt: Date.now(),
              faviconUrl: computeFavicon(url)
            }
          : b
      )
    );
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