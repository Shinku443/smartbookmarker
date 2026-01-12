# Emperor Sync Test Plan

This document defines the core scenarios and manual/automated tests for Emperor's local-first sync engine with CouchDB as the source of truth. It assumes:

- Frontend: local store + mutation queue
- Backend: REST API + CouchDB
- Sync: push local mutations, pull remote changes, merge with conflict resolution
- Deletes: tombstones (deleted: true, deletedAt not null)

---

## 1. Core concepts

- **Entity:** Book, Page, Tag, etc.
- **Mutation queue:** Local log of unsynced operations (create, update, delete, reorder, pin).
- **Tombstone:** Document with `deleted: true`, `deletedAt` set, stored in CouchDB.
- **Sync cycle:**
  1. Collect pending mutations
  2. Push to backend
  3. Pull remote changes (since last sync)
  4. Merge with conflict resolution
  5. Update local state and mutation queue

---

## 2. Test environment

- **Browser A:** Main device
- **Browser B:** Second device (or second tab with independent storage)
- **Debug panel:** Exposes:
  - Local mutations
  - Tombstones
  - Sync status
  - Manual sync controls
  - Local vs backend operations

---

## 3. Basic happy-path tests

### 3.1 Create sync

**Goal:** A created item on one device appears on all devices.

**Steps:**
1. Create Page on Browser A.
2. Confirm it appears immediately in UI.
3. Trigger sync on Browser A.
4. Trigger sync on Browser B.
5. Confirm Page appears on Browser B with same ID and content.

**Checks:**
- **ID consistency:** Same ID on A, B, and CouchDB.
- **Mutation queue:** Mutation removed after successful sync.
- **Timestamps:** `updatedAt` is consistent across devices.

---

### 3.2 Edit sync

**Goal:** Edits propagate and overwrite older versions.

**Steps:**
1. Create Page on A.
2. Sync A → sync B.
3. Edit title/content on A.
4. Sync A → sync B.
5. Confirm B shows updated content.

**Checks:**
- **Conflict resolution:** Last `updatedAt` wins.
- **Mutation queue:** Only pending updates are visible before sync, empty after.

---

### 3.3 Delete sync (local-first)

**Goal:** Local delete is tombstoned and replicated.

**Steps:**
1. Create Page on A.
2. Sync A → sync B.
3. On A, use **Delete Local**:
   - Item disappears from UI.
   - Tombstone appears in local inspector.
   - Mutation added to queue.
4. Sync A → sync B.

**Checks:**
- **On A:** Mutation removed from queue after success.
- **On B:** Item disappears after pull.
- **In CouchDB:** Document has `deleted: true`, `deletedAt` set.

---

## 4. Conflict tests

### 4.1 Edit vs edit (A vs B)

**Goal:** Last write wins by `updatedAt`.

**Steps:**
1. Create Page on A.
2. Sync A → sync B.
3. Edit title on A to "Title A".
4. Edit title on B to "Title B" slightly later.
5. Sync A and B (order doesn't matter).

**Expected:**
- Final title on both A and B is from the edit with the latest `updatedAt`.

---

### 4.2 Edit vs delete

**Goal:** Delete wins if `deletedAt > updatedAt`.

**Steps:**
1. Create Page on A, sync to B.
2. Edit Page on A.
3. Delete Page on B (using Delete Local or Delete Backend).
4. Sync both.

**Expected:**
- Page is deleted on both.
- Tombstone present in CouchDB and local tombstone inspector.
- Any pending edits for that ID are discarded.

---

### 4.3 Delete vs edit (inverse timing)

**Goal:** Edit wins if it happens after the delete.

**Steps:**
1. Create Page on A, sync to B.
2. Delete Page on A at T1.
3. Edit Page on B at T2 where T2 > T1 (simulate via debug controls if needed).
4. Sync both.

**Expected:**
- Page is present with edited data.
- Delete is overridden by later update.
- Tombstone inspector shows only the latest state (not deleted).

---

## 5. Offline tests

### 5.1 Offline create and sync

**Goal:** Creates while offline sync cleanly once online.

**Steps:**
1. Turn off backend or enable "Simulate Offline" in debug panel on A.
2. Create multiple Pages on A.
3. Confirm mutations in queue and no backend calls.
4. Turn backend back on or disable offline mode.
5. Trigger sync.

**Expected:**
- All Pages are persisted to CouchDB.
- B receives all Pages after its sync.
- Queue is empty after successful sync.

---

### 5.2 Offline delete and sync

**Goal:** Deletes while offline propagate once online.

**Steps:**
1. Create Page on A, sync to B.
2. Simulate offline on A.
3. Delete Page locally (Delete Local).
4. Confirm tombstone + queued mutation.
5. Go online and sync A → sync B.

**Expected:**
- Page disappears on B.
- Tombstone stored in CouchDB.

---

## 6. Ordering and pinning tests

### 6.1 Reorder conflict

**Goal:** Latest ordering wins across devices.

**Steps:**
1. Create 3 Pages (P1, P2, P3) on A; sync to B.
2. Reorder on A (P3, P1, P2).
3. Reorder differently on B (P2, P3, P1) slightly later.
4. Sync both.

**Expected:**
- Final order matches the latest `updatedAt` for ordering changes.
- No duplicates or gaps.

---

### 6.2 Pin/unpin sync

**Goal:** Pinned state syncs correctly.

**Steps:**
1. Create Page on A, sync to B.
2. Pin Page on A.
3. Sync A, then B.
4. Confirm B shows pinned state.
5. Unpin on B, sync both.

**Expected:**
- Pin/unpin states converge across devices based on latest timestamp.

---

## 7. Tombstone lifecycle tests

### 7.1 Tombstone persistence

**Goal:** Ensure tombstones persist long enough for all devices to see deletes.

**Steps:**
1. Create Page on A, sync to B.
2. Delete Page on A, sync A.
3. Do not sync B yet.
4. Verify tombstone is present in CouchDB and local tombstone inspector.
5. Sync B.

**Expected:**
- B deletes the Page correctly.
- No resurrection if B had stale data.

---

### 7.2 Tombstone purge (optional)

If implementing purge:

**Goal:** Purging old tombstones does not break late-arriving clients.

**Steps:**
1. Same as 7.1, but simulate purge after all devices have synced.
2. Join a "new" device C later.

**Expected:**
- C does not see purged documents as live items (depends on purge strategy).

---

## 8. Expected Sync Behavior Matrix

| Action | Local Result | Backend Result | After Sync |
|--------|-------------|----------------|------------|
| Delete Local | Item disappears immediately | Tombstone created on push | All devices delete |
| Delete Backend | No immediate change | Tombstone created | Local deletes on pull |
| Edit Local + Delete Backend | Local edit applied | Backend tombstone | Delete wins |
| Delete Local + Edit Backend | Local tombstone | Backend edit | Newer timestamp wins |
| Delete Local offline | Local tombstone | No backend change | Sync pushes delete |
| Delete Backend offline | No local change | Backend tombstone | Sync pulls delete |

---

## 9. Testing Strategy Phases

### Phase 1 — Local-first correctness
- Create → delete local → sync
- Edit → delete local → sync
- Reorder → delete local → sync

### Phase 2 — Multi-device correctness
- Open two browsers
- Browser A: delete local
- Browser B: edit
- Sync both → confirm delete wins

### Phase 3 — Offline correctness
- Turn off backend
- Delete local, make edits
- Turn backend on → sync
- Confirm correct resolution

### Phase 4 — Tombstone correctness
- Delete backend → sync
- Confirm local removes item
- Confirm no resurrection

### Phase 5 — Stress testing
- Rapid create/edit/delete cycles
- Reorder + delete, pin + delete
- Delete parent book → pages cascade
