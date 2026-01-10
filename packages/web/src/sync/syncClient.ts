import { syncLog, syncLogCreate, syncLogDelete } from "./logger";
import type { SyncChange, SyncPayload } from "./types";
import type { PushPayload } from "./syncPayloadBuilder";

type LocalSyncMetadata = {
  entityType: "book" | "page" | "tag";
  entityId: string;
  version: number;
  updatedAt: string;
  deleted: boolean;
  pending: boolean;
};

export class SyncClient {
  private lastSyncAt: string | null;
  private localSyncMetadata: LocalSyncMetadata[];

  constructor(private baseUrl: string = "") {
    // Load last sync time
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

    // Load local sync metadata
    const metadataStr = localStorage.getItem("localSyncMetadata");
    this.localSyncMetadata = metadataStr ? JSON.parse(metadataStr) : [];

    // Clean up any stale metadata
    this.cleanupStaleMetadata();
  }

  private saveMetadata() {
    localStorage.setItem("localSyncMetadata", JSON.stringify(this.localSyncMetadata));
  }

  private cleanupStaleMetadata() {
    const now = Date.now();
    // Remove metadata older than 30 days
    this.localSyncMetadata = this.localSyncMetadata.filter(metadata => {
      const metadataTime = new Date(metadata.updatedAt).getTime();
      return now - metadataTime < 30 * 24 * 60 * 60 * 1000; // 30 days
    });
    this.saveMetadata();
  }

  private getMetadata(entityType: string, entityId: string): LocalSyncMetadata | null {
    return this.localSyncMetadata.find(m => m.entityType === entityType && m.entityId === entityId) || null;
  }

  private updateMetadata(entityType: string, entityId: string, updates: Partial<LocalSyncMetadata>) {
    const existing = this.getMetadata(entityType, entityId);
    const now = new Date().toISOString();

    if (existing) {
      Object.assign(existing, updates, { updatedAt: now });
    } else {
      this.localSyncMetadata.push({
        entityType: entityType as "book" | "page" | "tag",
        entityId,
        version: 1,
        updatedAt: now,
        deleted: false,
        pending: true,
        ...updates
      });
    }

    this.saveMetadata();
  }

  private markAsSynced(entityType: string, entityId: string) {
    const metadata = this.getMetadata(entityType, entityId);
    if (metadata) {
      metadata.pending = false;
      metadata.version++;
      metadata.updatedAt = new Date().toISOString();
      this.saveMetadata();
    }
  }

  private markAsDeleted(entityType: string, entityId: string) {
    const metadata = this.getMetadata(entityType, entityId);
    if (metadata) {
      metadata.deleted = true;
      metadata.pending = true;
      metadata.updatedAt = new Date().toISOString();
    } else {
      this.localSyncMetadata.push({
        entityType: entityType as "book" | "page" | "tag",
        entityId,
        version: 1,
        updatedAt: new Date().toISOString(),
        deleted: true,
        pending: true
      });
    }
    this.saveMetadata();
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

      // Mark all pushed entities as synced
      payload.books.forEach(book => this.markAsSynced("book", book.id));
      payload.pages.forEach(page => this.markAsSynced("page", page.id));

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

      // Clean up local metadata for entities that were successfully synced from server
      // For now, just update versions for entities that exist in the payload
      payload.changes.forEach(change => {
        // For non-deleted entities, update our local version to match server
        const localMeta = this.getMetadata(change.entityType, change.entityId);
        if (localMeta) {
          localMeta.version = change.version;
          localMeta.pending = false;
          localMeta.updatedAt = change.updatedAt;
        }
      });

      // Clean up any deleted entities that might be in our local metadata
      // but are not in the server's changes (meaning they were deleted on server)
      this.localSyncMetadata = this.localSyncMetadata.filter(localMeta => {
        // If it's marked as deleted and pending, keep it (it needs to be synced)
        if (localMeta.deleted && localMeta.pending) {
          return true;
        }
        // If it's not in the server's changes and not pending, it might be deleted on server
        const existsOnServer = payload.changes.some(change =>
          change.entityType === localMeta.entityType && change.entityId === localMeta.entityId
        );
        return existsOnServer || localMeta.pending;
      });

      this.saveMetadata();

      syncLog("Sync completed successfully");
      return payload;
    } catch (err: any) {
      syncLog("Sync error:", err);
      return null;
    }
  }

  // New method to get pending changes
  getPendingChanges(): { books: string[]; pages: string[]; tags: string[] } {
    const pending = this.localSyncMetadata.filter(m => m.pending && !m.deleted);
    return {
      books: pending.filter(m => m.entityType === "book").map(m => m.entityId),
      pages: pending.filter(m => m.entityType === "page").map(m => m.entityId),
      tags: pending.filter(m => m.entityType === "tag").map(m => m.entityId)
    };
  }

  // New method to get all local sync metadata
  getAllMetadata(): LocalSyncMetadata[] {
    return [...this.localSyncMetadata];
  }

  // New method to reset sync state (for debugging/testing)
  resetSyncState() {
    this.lastSyncAt = null;
    this.localSyncMetadata = [];
    localStorage.removeItem("lastSyncAt");
    localStorage.removeItem("localSyncMetadata");
  }

}
