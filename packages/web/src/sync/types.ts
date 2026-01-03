export type SyncState = { lastSyncAt: string | null; pending: boolean; error: string | null; };

export type SyncEvent = {
  id: string;
  timestamp: string;
  type: 'pull' | 'push' | 'error';
  description: string;
  details?: any;
};

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
