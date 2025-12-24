import { loadJSON } from "../lib/file";
import { apiPost } from "../lib/api";

export async function runImport(path?: string) {
  if (!path) {
    console.log("❌ Missing file path: emperor import <file>");
    return;
  }

  console.log(\📥 Importing from \...\);

  const data = await loadJSON(path);
  await apiPost("/import", { bookmarks: data });

  console.log("✅ Import complete");
}
