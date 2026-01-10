import { Bookmark, BookmarkTag } from "../models/Bookmark";
import { generateTags } from "../tagging/autoTagger";

export interface ImportProgress {
  total: number;
  processed: number;
  currentItem?: string;
  duplicates: number;
  errors: number;
}

export interface ImportResult {
  bookmarks: Bookmark[];
  folders: ImportFolder[];
  rootBookmarks: Bookmark[]; // Root-level bookmarks (not in any folder)
  stats: {
    total: number;
    imported: number;
    duplicates: number;
    errors: number;
  };
}

export interface ImportFolder {
  id: string;
  name: string;
  parentId?: string;
  bookmarks: Bookmark[];
  children: ImportFolder[];
}

export interface ExportOptions {
  format: 'html' | 'json' | 'csv' | 'markdown';
  includeTags: boolean;
  includeDescriptions: boolean;
  includeDates: boolean;
  folderStructure: boolean;
}

export interface ImportOptions {
  onProgress?: (progress: ImportProgress) => void;
  detectDuplicates: boolean;
  mergeDuplicates: boolean;
  importFolders: boolean;
  skipInvalid: boolean;
}

/**
 * Enhanced Bookmark Importer
 * --------------------------
 * Supports multiple import formats and provides comprehensive import functionality
 * with progress tracking, duplicate detection, and error handling.
 */
export class EnhancedBookmarkImporter {
  private options: ImportOptions;

  constructor(options: Partial<ImportOptions> = {}) {
    this.options = {
      detectDuplicates: true,
      mergeDuplicates: false,
      importFolders: true,
      skipInvalid: true,
      ...options
    };
  }

  /**
   * Import bookmarks from HTML (Netscape format)
   */
  async importFromHtml(html: string): Promise<ImportResult> {
    console.log('🔍 EnhancedBookmarkImporter.importFromHtml called with HTML length:', html.length);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    console.log('🔍 HTML document parsed, body children:', Array.from(doc.body.children).map(c => c.tagName));

    const progress: ImportProgress = {
      total: 0,
      processed: 0,
      duplicates: 0,
      errors: 0
    };

    let allBookmarks: Bookmark[] = [];
    let rootBookmarks: Bookmark[] = [];
    let rootFolders: ImportFolder[] = [];

    try {
      // Parse folder structure
      console.log('🔍 About to call parseHtmlFolders...');
      const parseResult = this.parseHtmlFolders(doc);
      rootFolders = parseResult.folders;
      rootBookmarks = parseResult.rootBookmarks;
      console.log('🔍 parseHtmlFolders returned:', rootFolders.length, 'folders,', rootBookmarks.length, 'root bookmarks');

      allBookmarks = this.flattenFolders(rootFolders);
      console.log('🔍 flattenFolders returned:', allBookmarks.length, 'bookmarks');

      progress.total = allBookmarks.length + rootBookmarks.length;
    } catch (error) {
      console.error('🔍 ERROR in importFromHtml:', error);
      throw error;
    }

    const bookmarks: Bookmark[] = [];
    const processedRootBookmarks: Bookmark[] = [];
    const seenUrls = new Set<string>();

    // Process folder bookmarks
    for (const bookmark of allBookmarks) {
      progress.processed++;
      progress.currentItem = bookmark.title;

      try {
        // Duplicate detection
        if (this.options.detectDuplicates && seenUrls.has(bookmark.url)) {
          progress.duplicates++;
          if (!this.options.mergeDuplicates) {
            continue;
          }
        }

        seenUrls.add(bookmark.url);

        // Generate auto tags
        const autoTags = await generateTags(bookmark.title, bookmark.url);

        const fullBookmark: Bookmark = {
          id: bookmark.id || crypto.randomUUID(),
          url: bookmark.url,
          title: bookmark.title,
          createdAt: bookmark.createdAt || Date.now(),
          updatedAt: bookmark.updatedAt || Date.now(),
          faviconUrl: bookmark.faviconUrl || this.computeFavicon(bookmark.url),
          tags: [
            ...autoTags.map(label => ({ label, type: "auto" as const })),
            ...(bookmark.tags || [])
          ],
          source: "imported",
          bookId: bookmark.bookId || null,
          description: bookmark.description,
          metaDescription: bookmark.metaDescription,
          extractedText: bookmark.extractedText
        };

        bookmarks.push(fullBookmark);

      } catch (error) {
        progress.errors++;
        if (!this.options.skipInvalid) {
          throw error;
        }
      }

      this.options.onProgress?.(progress);
    }

    // Process root bookmarks (no folder assignment)
    for (const bookmark of rootBookmarks) {
      progress.processed++;
      progress.currentItem = bookmark.title;

      try {
        // Duplicate detection
        if (this.options.detectDuplicates && seenUrls.has(bookmark.url)) {
          progress.duplicates++;
          if (!this.options.mergeDuplicates) {
            continue;
          }
        }

        seenUrls.add(bookmark.url);

        // Generate auto tags
        const autoTags = await generateTags(bookmark.title, bookmark.url);

        const fullBookmark: Bookmark = {
          id: bookmark.id || crypto.randomUUID(),
          url: bookmark.url,
          title: bookmark.title,
          createdAt: bookmark.createdAt || Date.now(),
          updatedAt: bookmark.updatedAt || Date.now(),
          faviconUrl: bookmark.faviconUrl || this.computeFavicon(bookmark.url),
          tags: [
            ...autoTags.map(label => ({ label, type: "auto" as const })),
            ...(bookmark.tags || [])
          ],
          source: "imported",
          bookId: null, // Root bookmarks have no folder
          description: bookmark.description,
          metaDescription: bookmark.metaDescription,
          extractedText: bookmark.extractedText
        };

        processedRootBookmarks.push(fullBookmark);

      } catch (error) {
        progress.errors++;
        if (!this.options.skipInvalid) {
          throw error;
        }
      }

      this.options.onProgress?.(progress);
    }

    return {
      bookmarks,
      folders: rootFolders,
      rootBookmarks: processedRootBookmarks,
      stats: {
        total: progress.total,
        imported: bookmarks.length + processedRootBookmarks.length,
        duplicates: progress.duplicates,
        errors: progress.errors
      }
    };
  }

  /**
   * Import bookmarks from Chrome JSON format
   */
  async importFromChromeJson(jsonString: string): Promise<ImportResult> {
    const data = JSON.parse(jsonString);
    const rootFolder = data.roots?.bookmark_bar || data.roots?.other;

    const folders = this.parseChromeFolders(rootFolder);
    const allBookmarks = this.flattenFolders(folders);

    return this.processBookmarks(allBookmarks);
  }

  /**
   * Import bookmarks from Firefox JSON format
   */
  async importFromFirefoxJson(jsonString: string): Promise<ImportResult> {
    const data = JSON.parse(jsonString);
    const folders = this.parseFirefoxFolders(data.children || []);
    const allBookmarks = this.flattenFolders(folders);

    return this.processBookmarks(allBookmarks);
  }

  /**
   * Export bookmarks to various formats
   */
  exportBookmarks(bookmarks: Bookmark[], folders: any[], options: ExportOptions): string {
    switch (options.format) {
      case 'html':
        return this.exportToHtml(bookmarks, folders, options);
      case 'json':
        return this.exportToJson(bookmarks, folders, options);
      case 'csv':
        return this.exportToCsv(bookmarks, options);
      case 'markdown':
        return this.exportToMarkdown(bookmarks, folders, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private parseHtmlFolders(doc: Document): { folders: ImportFolder[], rootBookmarks: Bookmark[] } {
    const folders: ImportFolder[] = [];
    const rootBookmarks: Bookmark[] = [];

    // Start parsing from the body element
    const result = this.parseElementFolders(doc.body);
    folders.push(...result.folders);
    rootBookmarks.push(...result.rootBookmarks);

    return { folders, rootBookmarks };
  }

  private parseElementFolders(element: Element): { folders: ImportFolder[], rootBookmarks: Bookmark[] } {
    const folders: ImportFolder[] = [];
    const rootBookmarks: Bookmark[] = [];

    // Netscape format wraps DT elements in P tags, so we need to look deeper
    const allElements = Array.from(element.querySelectorAll('*'));
    const dtElements = allElements.filter(el => el.tagName === 'DT');

    for (let i = 0; i < dtElements.length; i++) {
      const child = dtElements[i];

      // Look for DT elements that contain H3 (folders)
      if (child.tagName === 'DT') {
        const dtChildren = Array.from(child.children);

        for (let j = 0; j < dtChildren.length; j++) {
          const dtChild = dtChildren[j];

          if (dtChild.tagName === 'H3') {
            // Found a folder
            const folderName = dtChild.textContent?.trim() || `Folder ${i}`;
            const folder: ImportFolder = {
              id: crypto.randomUUID(),
              name: folderName,
              bookmarks: [],
              children: []
            };

            // Look for the DL element that contains the folder contents
            // It might be in the same DT or the next sibling
            let folderDl: Element | null = null;

            // Check remaining children of this DT
            for (let k = j + 1; k < dtChildren.length; k++) {
              if (dtChildren[k].tagName === 'DL') {
                folderDl = dtChildren[k];
                break;
              }
            }

            // If not found, check the next sibling of the parent DT
            if (!folderDl) {
              const nextSibling = dtElements[i + 1]?.parentElement?.nextElementSibling;
              if (nextSibling && nextSibling.tagName === 'DL') {
                folderDl = nextSibling;
              }
            }

            // Parse folder contents if DL was found
            if (folderDl) {
              const subResult = this.parseElementFolders(folderDl);
              folder.children.push(...subResult.folders);

              // Also look for direct DT children in the DL
              const dlChildren = Array.from(folderDl.children);
              for (const dlChild of dlChildren) {
                if (dlChild.tagName === 'DT') {
                  const dtGrandChildren = Array.from(dlChild.children);
                  for (const dtGrandChild of dtGrandChildren) {
                    if (dtGrandChild.tagName === 'A' && (dtGrandChild as HTMLAnchorElement).href) {
                      // Found a bookmark
                      const bookmark = this.parseHtmlBookmark(dtGrandChild);
                      if (bookmark) {
                        folder.bookmarks.push(bookmark);
                      }
                    }
                  }
                }
              }
            }

            folders.push(folder);
            break; // Found the H3, processed the folder
          }

          else if (dtChild.tagName === 'A' && (dtChild as HTMLAnchorElement).href) {
            // Found a root-level bookmark - add to rootBookmarks instead of creating a folder
            const bookmark = this.parseHtmlBookmark(dtChild);
            if (bookmark) {
              rootBookmarks.push(bookmark);
            }
            break; // Found the A, processed the bookmark
          }
        }
      }
    }

    return { folders, rootBookmarks };
  }

  private parseHtmlFolder(dl: Element, parentId?: string): ImportFolder | null {
    const h3 = dl.previousElementSibling;
    if (!h3 || h3.tagName !== 'H3') return null;

    const folder: ImportFolder = {
      id: crypto.randomUUID(),
      name: h3.textContent || 'Unnamed Folder',
      parentId,
      bookmarks: [],
      children: []
    };

    // Parse bookmarks and subfolders
    const children = Array.from(dl.children);
    for (const child of children) {
      if (child.tagName === 'DT') {
        const a = child.querySelector('a');
        if (a) {
          // It's a bookmark
          const bookmark = this.parseHtmlBookmark(a);
          if (bookmark) {
            folder.bookmarks.push(bookmark);
          }
        } else {
          // Check for nested DL (subfolder)
          const nestedDl = child.querySelector('dl');
          if (nestedDl) {
            const subfolder = this.parseHtmlFolder(nestedDl, folder.id);
            if (subfolder) {
              folder.children.push(subfolder);
            }
          }
        }
      }
    }

    return folder;
  }

  private parseHtmlBookmark(a: Element): Bookmark | null {
    const anchor = a as HTMLAnchorElement;
    const url = anchor.href;
    const title = anchor.textContent || url;
    const addDate = anchor.getAttribute('add_date');
    const lastModified = anchor.getAttribute('last_modified');

    if (!url) return null;

    return {
      id: crypto.randomUUID(),
      url,
      title,
      createdAt: addDate ? parseInt(addDate) * 1000 : Date.now(),
      updatedAt: lastModified ? parseInt(lastModified) * 1000 : Date.now(),
      tags: [],
      source: "imported",
      bookId: null
    };
  }

  private parseChromeFolders(chromeFolder: any): ImportFolder[] {
    if (!chromeFolder) return [];

    const folders: ImportFolder[] = [];

    function parseFolder(folder: any, parentId?: string): ImportFolder | null {
      if (!folder.children) return null;

      const importFolder: ImportFolder = {
        id: crypto.randomUUID(),
        name: folder.name || 'Unnamed Folder',
        parentId,
        bookmarks: [],
        children: []
      };

      for (const child of folder.children) {
        if (child.type === 'url') {
          const bookmark: Bookmark = {
            id: crypto.randomUUID(),
            url: child.url,
            title: child.name || child.url,
            createdAt: child.date_added ? Math.floor(child.date_added / 1000) : Date.now(),
            updatedAt: Date.now(),
            tags: [],
            source: "imported",
            bookId: null
          };
          importFolder.bookmarks.push(bookmark);
        } else if (child.type === 'folder') {
          const subfolder = parseFolder(child, importFolder.id);
          if (subfolder) {
            importFolder.children.push(subfolder);
          }
        }
      }

      return importFolder;
    }

    const rootFolder = parseFolder(chromeFolder);
    return rootFolder ? [rootFolder] : [];
  }

  private parseFirefoxFolders(firefoxChildren: any[]): ImportFolder[] {
    const folders: ImportFolder[] = [];

    function parseFolder(item: any, parentId?: string): ImportFolder | null {
      if (item.type !== 'text/x-moz-place-container') return null;

      const importFolder: ImportFolder = {
        id: crypto.randomUUID(),
        name: item.title || 'Unnamed Folder',
        parentId,
        bookmarks: [],
        children: []
      };

      if (item.children) {
        for (const child of item.children) {
          if (child.type === 'text/x-moz-place') {
            const bookmark: Bookmark = {
              id: crypto.randomUUID(),
              url: child.uri,
              title: child.title || child.uri,
              createdAt: child.dateAdded ? child.dateAdded / 1000 : Date.now(),
              updatedAt: child.lastModified ? child.lastModified / 1000 : Date.now(),
              tags: child.tags ? child.tags.split(',').map((tag: string) => ({ label: tag.trim(), type: "auto" as const })) : [],
              source: "imported",
              bookId: null
            };
            importFolder.bookmarks.push(bookmark);
          } else if (child.type === 'text/x-moz-place-container') {
            const subfolder = parseFolder(child, importFolder.id);
            if (subfolder) {
              importFolder.children.push(subfolder);
            }
          }
        }
      }

      return importFolder;
    }

    for (const item of firefoxChildren) {
      const folder = parseFolder(item);
      if (folder) {
        folders.push(folder);
      }
    }

    return folders;
  }

  private flattenFolders(folders: ImportFolder[]): Bookmark[] {
    const allBookmarks: Bookmark[] = [];

    function flatten(folder: ImportFolder, parentBookId?: string) {
      // Set bookId for bookmarks in this folder
      const folderBookId = folder.id;
      console.log('🔍 flattenFolders: Processing folder:', folder.name, 'with ID:', folderBookId, 'bookmarks:', folder.bookmarks.length);

      for (const bookmark of folder.bookmarks) {
        const bookmarkWithBookId = {
          ...bookmark,
          bookId: folderBookId
        };
        console.log('🔍 flattenFolders: Adding bookmark:', bookmark.title, 'to folder:', folder.name, 'bookId:', folderBookId);
        allBookmarks.push(bookmarkWithBookId);
      }

      // Recursively process child folders
      for (const child of folder.children) {
        flatten(child, folderBookId);
      }
    }

    for (const folder of folders) {
      flatten(folder);
    }

    console.log('🔍 flattenFolders: Final result -', allBookmarks.length, 'bookmarks');
    console.log('🔍 flattenFolders: Sample bookmark bookIds:', allBookmarks.slice(0, 3).map(b => ({ title: b.title, bookId: b.bookId })));

    return allBookmarks;
  }

  private async processBookmarks(bookmarks: Bookmark[]): Promise<ImportResult> {
    const progress: ImportProgress = {
      total: bookmarks.length,
      processed: 0,
      duplicates: 0,
      errors: 0
    };

    const processedBookmarks: Bookmark[] = [];
    const seenUrls = new Set<string>();

    for (const bookmark of bookmarks) {
      progress.processed++;
      progress.currentItem = bookmark.title;

      try {
        if (this.options.detectDuplicates && seenUrls.has(bookmark.url)) {
          progress.duplicates++;
          if (!this.options.mergeDuplicates) {
            continue;
          }
        }

        seenUrls.add(bookmark.url);

        // Generate auto tags if not already present
        if (!bookmark.tags || bookmark.tags.length === 0) {
          const autoTags = await generateTags(bookmark.title, bookmark.url);
          bookmark.tags = autoTags.map(label => ({ label, type: "auto" as const }));
        }

        processedBookmarks.push(bookmark);

      } catch (error) {
        progress.errors++;
        if (!this.options.skipInvalid) {
          throw error;
        }
      }

      this.options.onProgress?.(progress);
    }

    return {
      bookmarks: processedBookmarks,
      folders: [],
      rootBookmarks: [],
      stats: {
        total: progress.total,
        imported: processedBookmarks.length,
        duplicates: progress.duplicates,
        errors: progress.errors
      }
    };
  }

  private computeFavicon(url: string): string {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=${url}`;
    }
  }

  private exportToHtml(bookmarks: Bookmark[], folders: any[], options: ExportOptions): string {
    const html = [`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bookmarks Export</title>
</head>
<body>
  <h1>Bookmarks</h1>
  <dl>`];

    for (const bookmark of bookmarks) {
      const addDate = options.includeDates ? ` add_date="${Math.floor(bookmark.createdAt / 1000)}"` : '';
      const tags = options.includeTags && bookmark.tags ? ` tags="${bookmark.tags.map(t => t.label).join(',')}"` : '';

      html.push(`    <dt><a href="${bookmark.url}"${addDate}${tags}>${this.escapeHtml(bookmark.title)}</a></dt>`);
    }

    html.push(`  </dl>
</body>
</html>`);

    return html.join('\n');
  }

  private exportToJson(bookmarks: Bookmark[], folders: any[], options: ExportOptions): string {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        url: b.url,
        title: b.title,
        ...(options.includeDates && {
          createdAt: b.createdAt,
          updatedAt: b.updatedAt
        }),
        ...(options.includeTags && { tags: b.tags }),
        ...(options.includeDescriptions && {
          description: b.description,
          metaDescription: b.metaDescription
        })
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  private exportToCsv(bookmarks: Bookmark[], options: ExportOptions): string {
    const headers = ['URL', 'Title'];
    if (options.includeDates) headers.push('Created', 'Updated');
    if (options.includeTags) headers.push('Tags');
    if (options.includeDescriptions) headers.push('Description');

    const csv = [headers.join(',')];

    for (const bookmark of bookmarks) {
      const row = [
        `"${bookmark.url.replace(/"/g, '""')}"`,
        `"${bookmark.title.replace(/"/g, '""')}"`
      ];

      if (options.includeDates) {
        row.push(
          new Date(bookmark.createdAt).toISOString(),
          new Date(bookmark.updatedAt).toISOString()
        );
      }

      if (options.includeTags) {
        const tags = bookmark.tags?.map(t => t.label).join(';') || '';
        row.push(`"${tags}"`);
      }

      if (options.includeDescriptions) {
        const desc = bookmark.description || bookmark.metaDescription || '';
        row.push(`"${desc.replace(/"/g, '""')}"`);
      }

      csv.push(row.join(','));
    }

    return csv.join('\n');
  }

  private exportToMarkdown(bookmarks: Bookmark[], folders: any[], options: ExportOptions): string {
    const lines = ['# Bookmarks Export', '', `Exported on ${new Date().toLocaleDateString()}`, ''];

    for (const bookmark of bookmarks) {
      lines.push(`## [${bookmark.title}](${bookmark.url})`);

      if (options.includeDates) {
        lines.push(`- Created: ${new Date(bookmark.createdAt).toLocaleDateString()}`);
        lines.push(`- Updated: ${new Date(bookmark.updatedAt).toLocaleDateString()}`);
      }

      if (options.includeTags && bookmark.tags && bookmark.tags.length > 0) {
        lines.push(`- Tags: ${bookmark.tags.map(t => `\`${t.label}\``).join(', ')}`);
      }

      if (options.includeDescriptions && bookmark.description) {
        lines.push(`- Description: ${bookmark.description}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

