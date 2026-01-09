import { syncLog, syncLogCreate, syncLogDelete } from "./logger";
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
    // Log creates vs updates
    const createdBooks = payload.books.filter(book => {
      const createdTime = new Date(book.createdAt).getTime();
      const updatedTime = new Date(book.updatedAt).getTime();
      return Math.abs(updatedTime - createdTime) < 1000; // Within 1 second = new
    });
    const updatedBooks = payload.books.filter(book => !createdBooks.some(cb => cb.id === book.id));

    const createdPages = payload.pages.filter(page => {
      const createdTime = new Date(page.createdAt).getTime();
      const updatedTime = new Date(page.updatedAt).getTime();
      return Math.abs(updatedTime - createdTime) < 1000; // Within 1 second = new
    });
    const updatedPages = payload.pages.filter(page => !createdPages.some(cp => cp.id === page.id));

    syncLog("Starting push…", {
      books: payload.books.length,
      pages: payload.pages.length,
      tags: payload.tags.length,
    });

    if (createdBooks.length > 0) {
      syncLogCreate(`Pushing ${createdBooks.length} new books:`, createdBooks.map(b => `${b.id} (${b.title})`));
    }
    if (updatedBooks.length > 0) {
      syncLog(`Pushing ${updatedBooks.length} updated books:`, updatedBooks.map(b => `${b.id} (${b.title})`));
    }
    if (createdPages.length > 0) {
      syncLogCreate(`Pushing ${createdPages.length} new pages:`, createdPages.map(p => `${p.id} (${p.title})`));
    }
    if (updatedPages.length > 0) {
      syncLog(`Pushing ${updatedPages.length} updated pages:`, updatedPages.map(p => `${p.id} (${p.title})`));
    }

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

  async pushDeletion(entityType: string, entityId: string): Promise<boolean> {
    syncLogDelete(`Starting push deletion for ${entityType}: ${entityId}`);

    try {
      // For deletions, we send a minimal payload that will trigger the deletion logic on the server
      const payload = {
        books: [],
        pages: [],
        tags: [],
        deletions: [{ entityType, entityId }]
      };

      const res = await fetch(`${this.baseUrl}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        syncLogDelete("Push deletion failed: server returned non-OK", res.status);
        return false;
      }

      syncLogDelete("Push deletion completed successfully");
      return true;
    } catch (err: any) {
      syncLogDelete("Push deletion error:", err);
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
