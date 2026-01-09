import { Bookmark } from "../models/Bookmark";
import { generateTags } from "../tagging/autoTagger";

interface BookmarkFolder {
  name: string;
  bookmarks: Bookmark[];
  children: BookmarkFolder[];
}

export async function importBookmarksFromHtml(html: string): Promise<Bookmark[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Debug: Log what we're parsing
  console.log('🔍 HTML Import Debug: Parsing HTML document');
  console.log('🔍 HTML Import Debug: Body children:', Array.from(doc.body.children).map(c => c.tagName));

  // Parse the folder structure starting from the body
  const rootFolder = await parseFolderStructure(doc.body);

  console.log('🔍 HTML Import Debug: Root folder structure:', rootFolder);

  // Flatten the hierarchical structure into bookmarks with bookId references
  const results: Bookmark[] = [];
  const bookNameToId = new Map<string, string>();

  await flattenFolderStructure(rootFolder, results, bookNameToId, null);

  console.log('🔍 HTML Import Debug: Final results:', results.length, 'bookmarks');
  console.log('🔍 HTML Import Debug: Book name mappings:', Array.from(bookNameToId.entries()));

  return results;
}

async function parseFolderStructure(element: Element): Promise<BookmarkFolder> {
  const folder: BookmarkFolder = {
    name: "Root",
    bookmarks: [],
    children: []
  };

  const children = Array.from(element.children);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    // Handle DT elements that contain H3 or A
    if (child.tagName === 'DT') {
      const dtChildren = Array.from(child.children);

      for (let j = 0; j < dtChildren.length; j++) {
        const dtChild = dtChildren[j];

        if (dtChild.tagName === 'H3') {
          // Found a folder
          const folderName = dtChild.textContent?.trim() || `Folder ${i}`;
          const folderObj: BookmarkFolder = {
            name: folderName,
            bookmarks: [],
            children: []
          };

          // Look for the next DL element which contains the folder contents
          // It might be inside this DT or the next sibling
          let nextElement = dtChildren[j + 1];
          if (nextElement && nextElement.tagName === 'DL') {
            folderObj.children = await parseFolderContents(nextElement);
            j++; // Skip the DL element we just processed
          } else {
            // Check next sibling of the parent DT
            nextElement = children[i + 1];
            if (nextElement && nextElement.tagName === 'DL') {
              folderObj.children = await parseFolderContents(nextElement);
              i++; // Skip the DL element we just processed
            }
          }

          folder.children.push(folderObj);
          break; // Found the H3, no need to check other children of this DT

        } else if (dtChild.tagName === 'A' && dtChild.hasAttribute('href')) {
          // Found a bookmark at root level
          const bookmark = await createBookmarkFromAnchor(dtChild as HTMLAnchorElement);
          folder.bookmarks.push(bookmark);
          break; // Found the A, no need to check other children of this DT
        }
      }

    } else if (child.tagName === 'A' && child.hasAttribute('href')) {
      // Fallback: direct A tag (not wrapped in DT)
      const bookmark = await createBookmarkFromAnchor(child as HTMLAnchorElement);
      folder.bookmarks.push(bookmark);
    }
  }

  return folder;
}

async function parseFolderContents(dlElement: Element): Promise<BookmarkFolder[]> {
  const folders: BookmarkFolder[] = [];
  const children = Array.from(dlElement.children);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (child.tagName === 'DT') {
      const dtChildren = Array.from(child.children);

      for (let j = 0; j < dtChildren.length; j++) {
        const dtChild = dtChildren[j];

        if (dtChild.tagName === 'H3') {
          // Found a subfolder
          const folderName = dtChild.textContent?.trim() || `Subfolder ${i}-${j}`;
          const folderObj: BookmarkFolder = {
            name: folderName,
            bookmarks: [],
            children: []
          };

          // Look for the next DD or nested DL
          let nextDtChild = dtChildren[j + 1];
          if (nextDtChild && nextDtChild.tagName === 'DL') {
            folderObj.children = await parseFolderContents(nextDtChild);
            j++; // Skip the DL we processed
          }

          folders.push(folderObj);

        } else if (dtChild.tagName === 'A' && dtChild.hasAttribute('href')) {
          // Found a bookmark in this folder
          const bookmark = await createBookmarkFromAnchor(dtChild as HTMLAnchorElement);
          // Add to the last folder if it exists, otherwise create a default folder
          if (folders.length === 0) {
            folders.push({
              name: "Default",
              bookmarks: [],
              children: []
            });
          }
          folders[folders.length - 1].bookmarks.push(bookmark);
        }
      }
    }
  }

  return folders;
}

async function createBookmarkFromAnchor(anchor: HTMLAnchorElement): Promise<Bookmark> {
  const url = anchor.href;
  const title = anchor.textContent?.trim() || url;
  const autoTags = await generateTags(title, url);

  return {
    id: crypto.randomUUID(),
    url,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    faviconUrl: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`,
    tags: autoTags.map(label => ({ label, type: "auto" })),
    source: "imported",
    bookId: null // Will be set by flattenFolderStructure
  };
}

async function flattenFolderStructure(
  folder: BookmarkFolder,
  results: Bookmark[],
  bookNameToId: Map<string, string>,
  parentBookName: string | null
): Promise<void> {
  // Create book entry for this folder if it's not root
  if (folder.name !== "Root") {
    const bookId = crypto.randomUUID();
    bookNameToId.set(folder.name, bookId);
  }

  // Process bookmarks in this folder
  for (const bookmark of folder.bookmarks) {
    const bookId = folder.name !== "Root" ? bookNameToId.get(folder.name)! : null;
    results.push({
      ...bookmark,
      bookId
    });
  }

  // Process child folders
  for (const childFolder of folder.children) {
    await flattenFolderStructure(childFolder, results, bookNameToId, folder.name);
  }
}
