import { syncLog } from "./logger";
import type { SyncChange, SyncPayload } from "./types";
import type { PushPayload } from "./syncPayloadBuilder";

export class SyncClient {
  private lastSyncAt: string | null;

  constructor(private baseUrl: string = "http://localhost:4000") {
    const stored = localStorage.getItem("lastSyncAt");
    if (stored) {
      const storedTime = new Date(stored).getTime();
      const now = Date.now();
      // Clear lastSyncAt if it's in the future
      if (storedTime > now + 1000) {
        localStorage.removeItem("lastSyncAt");
        this.lastSyncAt = null;
      } else {
        this.lastSyncAt = stored;
      }
    } else {
      this.lastSyncAt = null;
    }
  }

  async push(payload: PushPayload): Promise<boolean> {
    syncLog("Starting push…", {
      books: payload.books.length,
      pages: payload.pages.length,
      tags: payload.tags.length,
    });

    try {
      const res = await fetch(`${this.baseUrl}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        syncLog("Push failed: server returned non-OK", res.status);
        return false;
      }

      syncLog("Push completed successfully");
      return true;
    } catch (err: any) {
      syncLog("Push error:", err);
      return false;
    }
  }

  async sync(forceFull: boolean = false): Promise<SyncPayload | null> {
    // For offline-first, always do full sync to ensure we have all server data
    // The merge logic will handle conflicts by keeping local data
    const url = `${this.baseUrl}/sync`;
    syncLog("Starting sync…", { forceFull, url });

    try {
      const res = await fetch(url);
      if (!res.ok) {
        syncLog("Sync failed: server returned non-OK", res.status);
        return null;
      }

      const payload: SyncPayload = await res.json();
      syncLog("Received sync payload:", {
        changes: payload.changes.length,
        books: payload.books.length,
        pages: payload.pages.length,
        tags: payload.tags.length,
      });

      const newest = payload.changes.at(-1)?.updatedAt;
      if (newest) {
        const newestTime = new Date(newest).getTime();
        const now = Date.now();
        // Only update lastSyncAt if the server timestamp is not in the future
        if (newestTime <= now + 1000) { // Allow 1 second grace period
          this.lastSyncAt = newest;
          localStorage.setItem("lastSyncAt", newest);
          syncLog("Updated lastSyncAt →", newest);
        } else {
          syncLog("Server timestamp is in the future, clearing lastSyncAt");
          this.lastSyncAt = null;
          localStorage.removeItem("lastSyncAt");
        }
      }

      syncLog("Sync completed successfully");
      return payload;
    } catch (err: any) {
      syncLog("Sync error:", err);
      return null;
    }
  }

}
