import { syncLog } from "./logger";
import type { SyncChange, SyncPayload } from "./types";
import type { PushPayload } from "./syncPayloadBuilder";

export class SyncClient {
  private lastSyncAt: string | null;

  constructor(private baseUrl: string) {
    this.lastSyncAt = localStorage.getItem("lastSyncAt");
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

  async sync(): Promise<SyncPayload | null> {
    syncLog("Starting sync…", { lastSyncAt: this.lastSyncAt });

    const url = new URL(`${this.baseUrl}/sync`);

    if (this.lastSyncAt) {
      url.searchParams.set("since", this.lastSyncAt);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      syncLog("Sync failed: server returned non-OK", res.status);
      return null
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
      this.lastSyncAt = newest;
      localStorage.setItem("lastSyncAt", newest);
      syncLog("Updated lastSyncAt →", newest);
    }

    syncLog("Sync completed successfully");
    return payload;
  } catch(err: any) {
    syncLog("Sync error:", err);
    return null;
  }

}
