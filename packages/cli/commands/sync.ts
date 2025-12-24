import { apiGet, apiPost } from "../lib/api";

export async function runSync() {
  console.log("🔄 Syncing bookmarks...");

  const local = await apiGet("/bookmarks/local");
  const remote = await apiGet("/bookmarks/remote");

  const changes = {
    created: local.created,
    updated: local.updated,
    deleted: local.deleted
  };

  await apiPost("/sync", changes);

  console.log("✅ Sync complete");
}
