import { Bookmark } from "../models/Bookmark";
import { generateTags } from "../tagging/autoTagger";

export async function importBookmarksFromHtml(html: string): Promise<Bookmark[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const links = Array.from(doc.querySelectorAll("a[href]"));

  const results: Bookmark[] = [];

  for (const a of links) {
    const url = (a as HTMLAnchorElement).href;
    const title = a.textContent || url;
    const autoTags = await generateTags(title, url);

    results.push({
      id: crypto.randomUUID(),
      url,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      faviconUrl: `https://www.google.com/s2/favicons?domain=${url}`,
      tags: autoTags.map(label => ({ label, type: "auto" })),
      source: "imported",
      bookId: null
    });
  }

  return results;
}