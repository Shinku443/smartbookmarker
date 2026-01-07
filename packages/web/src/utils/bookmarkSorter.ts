import type { RichBookmark } from "../models/RichBookmark";
import type { SortMethod, SortDirection } from "../hooks/useAppSettings";

/**
 * bookmarkSorter.ts
 * -----------------
 * Utility functions for sorting bookmarks by various criteria.
 */

/**
 * Sort bookmarks by the specified method and direction
 */
export function sortBookmarks(
  bookmarks: RichBookmark[],
  method: SortMethod,
  direction: SortDirection
): RichBookmark[] {
  const sorted = [...bookmarks];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (method) {
      case 'manual':
        // Manual sorting - maintain current order
        return 0;

      case 'dateAdded':
        comparison = (a.createdAt || 0) - (b.createdAt || 0);
        break;

      case 'dateModified':
        comparison = (a.updatedAt || 0) - (b.updatedAt || 0);
        break;

      case 'alphabetical':
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        comparison = titleA.localeCompare(titleB);
        break;

      case 'url':
        const urlA = (a.url || '').toLowerCase();
        const urlB = (b.url || '').toLowerCase();
        comparison = urlA.localeCompare(urlB);
        break;

      case 'visits':
        // TODO: Implement visit count tracking
        comparison = 0;
        break;

      case 'lastVisited':
        // TODO: Implement last visited tracking
        comparison = 0;
        break;

      default:
        return 0;
    }

    return direction === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Get display name for sort method
 */
export function getSortMethodDisplayName(method: SortMethod): string {
  const names: Record<SortMethod, string> = {
    manual: 'Manual Order',
    dateAdded: 'Date Added',
    dateModified: 'Date Modified',
    alphabetical: 'Alphabetical',
    url: 'URL',
    visits: 'Visit Count',
    lastVisited: 'Last Visited'
  };

  return names[method];
}

/**
 * Get display name for sort direction
 */
export function getSortDirectionDisplayName(direction: SortDirection): string {
  return direction === 'asc' ? 'Ascending' : 'Descending';
}
