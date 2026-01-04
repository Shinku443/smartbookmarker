import type { Book, Page } from "../store/useBookmarksStore";

export type PushPayload = {
  books: {
    id: string;
    title: string;
    emoji: string | null;
    order: number;
    createdAt: string;
    updatedAt: string;
  }[];
  pages: {
    id: string;
    bookId: string | null;
    title: string;
    content: string;
    order: number;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
    tagIds?: string[];
  }[];
  tags: any[]; // TODO: implement tag sync
};

export class SyncPayloadBuilder {
  static buildPushPayload(books: Book[], pages: Page[]): PushPayload {
    const localOnlyBooks = books.filter(b => b.isLocalOnly || b.hasLocalChanges);
    const localOnlyPages = pages.filter(p => p.isLocalOnly || p.hasLocalChanges);

    return {
      books: localOnlyBooks.map(book => ({
        id: book.id,
        title: book.title,
        emoji: book.emoji,
        order: Number(book.order),
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      })),
      pages: localOnlyPages.map(page => ({
        id: page.id,
        bookId: page.bookId || null,
        title: page.title,
        content: page.content || "",
        order: Number(page.order),
        pinned: page.pinned,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        // TODO: include tags when tag sync is implemented
      })),
      tags: [], // TODO: implement tag sync
    };
  }
}
