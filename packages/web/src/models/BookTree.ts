import type { Book } from "../models/Book";

/**
 * BookTreeNode
 * ------------
 * Represents a node in the hierarchical book tree.
 */
export interface BookTreeNode extends Book {
  children: BookTreeNode[];
  depth: number;
}

/**
 * buildBookTree
 * --------------
 * Builds a hierarchical tree structure from a flat array of books.
 * Returns root-level books with their children nested.
 *
 * @param books - Flat array of books
 * @returns Array of root-level book tree nodes with children
 */
export function buildBookTree(books: Book[]): BookTreeNode[] {
  const bookMap = new Map<string, BookTreeNode>();
  const rootNodes: BookTreeNode[] = [];

  // First pass: create all nodes
  for (const book of books) {
    bookMap.set(book.id, {
      ...book,
      children: [],
      depth: 0
    });
  }

  // Second pass: build hierarchy
  for (const book of books) {
    const node = bookMap.get(book.id)!;

    if (book.parentBookId) {
      const parent = bookMap.get(book.parentBookId);
      if (parent) {
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        // Orphaned book, treat as root
        rootNodes.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  }

  // Sort children by creation time (could be enhanced with custom ordering)
  const sortChildren = (nodes: BookTreeNode[]) => {
    nodes.sort((a, b) => a.createdAt - b.createdAt);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };

  sortChildren(rootNodes);
  return rootNodes;
}

/**
 * flattenBookTree
 * ----------------
 * Flattens a book tree back into a flat array for storage.
 * Preserves the hierarchical structure in the parentBookId field.
 *
 * @param treeNodes - Root nodes of the book tree
 * @returns Flat array of books
 */
export function flattenBookTree(treeNodes: BookTreeNode[]): Book[] {
  const result: Book[] = [];

  const flatten = (nodes: BookTreeNode[]) => {
    for (const node of nodes) {
      result.push({
        id: node.id,
        name: node.name,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        order: node.order,
        parentBookId: node.parentBookId
      });
      flatten(node.children);
    }
  };

  flatten(treeNodes);
  return result;
}

/**
 * getBookPath
 * -----------
 * Gets the full path from root to a specific book.
 * Returns an array of book IDs from root to the target book.
 *
 * @param books - Flat array of books
 * @param targetBookId - ID of the target book
 * @returns Array of book IDs from root to target
 */
export function getBookPath(books: Book[], targetBookId: string): string[] {
  const path: string[] = [];
  let currentId: string | null = targetBookId;

  while (currentId) {
    path.unshift(currentId);
    const book = books.find(b => b.id === currentId);
    currentId = book?.parentBookId || null;
  }

  return path;
}

/**
 * getBookAncestors
 * -----------------
 * Gets all ancestor books of a specific book (from root down to parent).
 *
 * @param books - Flat array of books
 * @param bookId - ID of the book to get ancestors for
 * @returns Array of ancestor books from root to parent
 */
export function getBookAncestors(books: Book[], bookId: string): Book[] {
  const path = getBookPath(books, bookId);
  // Remove the last element (the book itself)
  path.pop();

  return path.map(id => books.find(b => b.id === id)!).filter(Boolean);
}