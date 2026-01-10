import { Book } from "../models/Book";
import { RichBookmark } from "../models/RichBookmark";

/**
 * Import utilities for processing bookmark import data
 */

interface Logger {
  log: (...args: any[]) => void;
}

const createLogger = (verbose: boolean): Logger => ({
  log: verbose ? console.log : () => {}
});

/**
 * Import utilities for processing bookmark import data
 */

export interface ImportFolder {
  id: string;
  name: string;
  parentId?: string;
  bookmarks: RichBookmark[];
  children: ImportFolder[];
}

export interface ProcessedImportData {
  newBooks: Book[];
  newBookmarks: RichBookmark[];
  bookMap: Map<string, string>;
}

/**
 * Creates books from imported folder structure
 */
export function createBooksFromFolders(
  folders: ImportFolder[] | undefined,
  existingBooks: Book[],
  rawAddBook: (name: string, parentId: string | null) => Book,
  logger: Logger = createLogger(false)
): { newBooks: Book[]; bookMap: Map<string, string> } {
  const bookMap = new Map<string, string>();
  const newBooks: Book[] = [];

  // Add existing books to the map
  for (const book of existingBooks) {
    bookMap.set(book.name, book.id);
  }

  if (!folders) return { newBooks, bookMap };

  // Collect unique folder names that need to be created
  const folderNamesToCreate = new Set<string>();

  function collectFolderNames(folder: ImportFolder) {
    if (!existingBooks.find(b => b.name === folder.name)) {
      folderNamesToCreate.add(folder.name);
    }
    folder.children.forEach(collectFolderNames);
  }

  folders.forEach(collectFolderNames);

  // Create all needed books
  for (const folderName of folderNamesToCreate) {
    const newBook = rawAddBook(folderName, null);
    newBooks.push(newBook);
    bookMap.set(folderName, newBook.id);
  }

  return { newBooks, bookMap };
}

/**
 * Processes imported bookmarks and assigns them to appropriate books
 */
export function processImportedBookmarks(
  importedBookmarks: RichBookmark[],
  folders: ImportFolder[] | undefined,
  rootBookmarks: RichBookmark[] | undefined,
  bookMap: Map<string, string>,
  existingBookmarks: RichBookmark[],
  computeFavicon: (url: string) => string,
  logger: Logger = createLogger(false)
): RichBookmark[] {
  const allBookmarks = [...importedBookmarks, ...(rootBookmarks || [])];
  const processedBookmarks: RichBookmark[] = [];

  // Create a map to track folder ID -> folder name for HTML imports
  const folderIdToName = new Map<string, string>();
  if (folders) {
    function buildFolderMap(folder: ImportFolder) {
      folderIdToName.set(folder.id, folder.name);
      folder.children.forEach(buildFolderMap);
    }
    folders.forEach(buildFolderMap);
  }

  for (const bookmark of allBookmarks) {
    try {
      // Skip bookmarklets (javascript: URLs) as they're not actual web pages
      if (bookmark.url && bookmark.url.startsWith('javascript:')) {
        logger.log('Skipping bookmarklet:', bookmark.title);
        continue;
      }

      let targetBookId: string | null = null;

      if (bookmark.bookId && typeof bookmark.bookId === 'string') {
        // For HTML imports, bookmark.bookId is the folder ID, get the actual folder name first
        const folderName = folderIdToName.get(bookmark.bookId) || bookmark.bookId;
        targetBookId = bookMap.get(folderName) || null;
      }

      // Create bookmark with new ID and proper structure
      const newBookmark: RichBookmark = {
        id: crypto.randomUUID(),
        title: bookmark.title,
        url: bookmark.url,
        createdAt: bookmark.createdAt || Date.now(),
        updatedAt: bookmark.updatedAt || Date.now(),
        bookId: targetBookId,
        pinned: false,
        tags: bookmark.tags || [],
        source: 'imported',
        faviconUrl: bookmark.faviconUrl || computeFavicon(bookmark.url)
      };

      processedBookmarks.push(newBookmark);

    } catch (error) {
      console.error('Failed to process bookmark:', bookmark.title, error);
    }
  }

  return processedBookmarks;
}

/**
 * Updates the bookmark order arrays after import
 */
export function updateBookmarkOrders(
  newBookmarks: RichBookmark[],
  existingBookmarks: RichBookmark[],
  existingBooks: Book[],
  rootOrder: string[]
): {
  nextBookmarks: RichBookmark[];
  nextRootOrder: string[];
  bookUpdates: Map<string, string[]>;
} {
  const nextBookmarks = [...existingBookmarks, ...newBookmarks];
  const nextRootOrder = [
    ...rootOrder,
    ...newBookmarks.filter(b => !b.bookId).map(b => b.id)
  ];

  // Update book orders for bookmarks assigned to books
  const bookUpdates = new Map<string, string[]>();
  for (const bookmark of newBookmarks) {
    if (bookmark.bookId) {
      if (!bookUpdates.has(bookmark.bookId)) {
        const existingBook = existingBooks.find(b => b.id === bookmark.bookId);
        bookUpdates.set(bookmark.bookId, existingBook ? [...(existingBook.order || [])] : []);
      }
      bookUpdates.get(bookmark.bookId)!.push(bookmark.id);
    }
  }

  return { nextBookmarks, nextRootOrder, bookUpdates };
}

/**
 * Updates book objects with new bookmark orders
 */
export function updateBooksWithNewOrders(
  existingBooks: Book[],
  bookUpdates: Map<string, string[]>
): Book[] {
  return existingBooks.map(book => {
    const newOrder = bookUpdates.get(book.id);
    if (newOrder) {
      return { ...book, order: newOrder };
    }
    return book;
  });
}
