import { apiGet } from "../lib/api";

export async function runStats() {
  console.log("📊 Bookmark statistics:");

  const bookmarks = await apiGet("/bookmarks");

  const total = bookmarks.length;
  const pinned = bookmarks.filter((b: any) => b.pinned).length;

  const tagCounts = new Map<string, number>();
  for (const b of bookmarks) {
    for (const t of b.tags ?? []) {
      tagCounts.set(t.label, (tagCounts.get(t.label) ?? 0) + 1);
    }
  }

  console.log(\Total: \\);
  console.log(\Pinned: \\);
  console.log("Top tags:");
  [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => console.log(\  \: \\));
}
