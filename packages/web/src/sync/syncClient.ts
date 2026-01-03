import { syncLog } from "./logger";

export type SyncChange = {
  entityType: "book" | "page" | "tag";
  entityId: string;
  version: number;
  updatedAt: string;
};

export type SyncPayload = {
  changes: SyncChange[];
  books: any[];
  pages: any[];
  tags: any[];
};

export class SyncClient {
  private lastSyncAt: string | null;

  constructor(private baseUrl: string) {
    this.lastSyncAt = localStorage.getItem("lastSyncAt");
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