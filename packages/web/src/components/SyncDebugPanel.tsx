import React, { useState } from "react";
import { useBookmarksStore } from "../store/useBookmarksStore";

export function SyncDebugPanel() {
  const syncStatus = useBookmarksStore(s => s.syncStatus);
  const lastSyncAt = useBookmarksStore(s => s.lastSyncAt);
  const syncError = useBookmarksStore(s => s.syncError);
  const lastSyncSummary = useBookmarksStore(s => s.lastSyncSummary);
  const syncEvents = useBookmarksStore(s => s.syncEvents);
  const syncWithServer = useBookmarksStore(s => s.syncWithServer);

  const [showTimeline, setShowTimeline] = useState(false);

  const isSyncing = syncStatus === "syncing";

  return (
    <div className="fixed bottom-3 right-3 max-w-xs rounded-md bg-neutral-900/95 text-neutral-100 text-xs shadow-lg border border-neutral-700 p-3 space-y-2 z-50">
      <div className="flex items-center justify-between">
        <span className="font-semibold tracking-wide">Sync</span>
        <button
          type="button"
          onClick={() => syncWithServer()}
          disabled={isSyncing}
          className="px-2 py-0.5 rounded border border-neutral-500 hover:bg-neutral-800 disabled:opacity-50"
        >
          {isSyncing ? "Syncing…" : "Force sync"}
        </button>
      </div>

      <div className="space-y-1">
        <div>
          <span className="text-neutral-400">Status:</span>{" "}
          <span
            className={
              syncStatus === "error"
                ? "text-red-400"
                : syncStatus === "syncing"
                ? "text-amber-300"
                : "text-emerald-300"
            }
          >
            {syncStatus}
          </span>
        </div>

        <div>
          <span className="text-neutral-400">Last sync:</span>{" "}
          <span>{lastSyncAt ?? "never"}</span>
        </div>

        {lastSyncSummary && (
          <div className="text-neutral-300">
            <div>
              Changes: <span>{lastSyncSummary.changes}</span>
            </div>
            <div>
              B:{lastSyncSummary.books} / P:{lastSyncSummary.pages} / T:
              {lastSyncSummary.tags}
            </div>
          </div>
        )}

        {syncError && (
          <div className="text-red-400">
            Error: <span>{syncError}</span>
          </div>
        )}
      </div>

      {/* Sync Timeline */}
      <div className="border-t border-neutral-700 pt-2">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
        >
          <span>{showTimeline ? "▼" : "▶"}</span>
          <span>Timeline ({syncEvents.length})</span>
        </button>

        {showTimeline && (
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {syncEvents.length === 0 ? (
              <div className="text-neutral-500 text-xs">No sync events yet</div>
            ) : (
              syncEvents.slice().reverse().map((event) => (
                <div
                  key={event.id}
                  className="text-xs border-l-2 pl-2 border-neutral-600"
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={
                        event.type === "error"
                          ? "text-red-400"
                          : event.type === "push"
                          ? "text-blue-400"
                          : "text-green-400"
                      }
                    >
                      {event.type === "pull" ? "↓" : event.type === "push" ? "↑" : "✗"}
                    </span>
                    <span className="text-neutral-300">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-neutral-400 ml-3">{event.description}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
