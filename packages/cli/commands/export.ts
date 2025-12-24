import { apiGet } from "../lib/api";
import { saveJSON } from "../lib/file";

export async function runExport() {
  console.log("📤 Exporting bookmarks...");

  const bookmarks = await apiGet("/bookmarks");
  await saveJSON("bookmarks-export.json", bookmarks);

  console.log("✅ Exported to bookmarks-export.json");
}
