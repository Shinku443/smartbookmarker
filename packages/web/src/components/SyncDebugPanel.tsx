import React, { useState } from "react";
import { useBookmarks } from "../hooks/useBookmarks";
import { useBookmarksStore } from "../store/useBookmarksStore";
import type { RichBookmark } from "../models/RichBookmark";

// Scenario Simulator Types
type ActorId = "A" | "B" | "Backend";
type EntityType = "page" | "book";
type ActionType = "create" | "update" | "delete-local" | "delete-backend" | "reorder" | "pin" | "sync" | "offline" | "online";

interface ScenarioStep {
  id: string;
  label?: string;
  actor: ActorId;
  entity?: EntityType;
  action: ActionType;
  args?: Record<string, unknown>;
}

interface Scenario {
  id: string;
  name: string;
  description?: string;
  steps: ScenarioStep[];
}

interface ExecutedStep {
  step: ScenarioStep;
  status: "pending" | "executed" | "error";
  error?: string;
}

interface Snapshot {
  stepId: string;
  label: string;
  createdAt: string;
  localA: unknown;
  localB: unknown;
  couchdb: unknown;
  mutationsA: unknown[];
  mutationsB: unknown[];
  tombstonesA: unknown[];
  tombstonesB: unknown[];
}

// Scenario definitions
const scenarios: Scenario[] = [
  {
    id: 'edit-vs-delete',
    name: 'Edit vs Delete Conflict',
    description: 'Test what happens when one device edits an item and another deletes it.',
    steps: [
      { id: '1', actor: 'A', entity: 'page', action: 'create', label: 'A creates page' },
      { id: '2', actor: 'A', action: 'sync', label: 'A syncs to server' },
      { id: '3', actor: 'B', action: 'sync', label: 'B syncs from server' },
      { id: '4', actor: 'A', entity: 'page', action: 'update', label: 'A edits the page' },
      { id: '5', actor: 'B', entity: 'page', action: 'delete-local', label: 'B deletes the page locally' },
      { id: '6', actor: 'A', action: 'sync', label: 'A syncs edit to server' },
      { id: '7', actor: 'B', action: 'sync', label: 'B syncs delete to server' },
      { id: '8', actor: 'A', action: 'sync', label: 'A pulls latest changes' },
      { id: '9', actor: 'B', action: 'sync', label: 'B pulls latest changes' }
    ]
  },
  {
    id: 'offline-deletes',
    name: 'Offline Deletes',
    description: 'Test deletions while offline and sync behavior.',
    steps: [
      { id: '1', actor: 'A', entity: 'book', action: 'create', label: 'A creates book' },
      { id: '2', actor: 'A', action: 'sync', label: 'A syncs to server' },
      { id: '3', actor: 'B', action: 'sync', label: 'B syncs from server' },
      { id: '4', actor: 'A', action: 'offline', label: 'A goes offline' },
      { id: '5', actor: 'A', entity: 'book', action: 'delete-local', label: 'A deletes book while offline' },
      { id: '6', actor: 'A', action: 'online', label: 'A comes back online' },
      { id: '7', actor: 'A', action: 'sync', label: 'A syncs delete to server' },
      { id: '8', actor: 'B', action: 'sync', label: 'B pulls delete from server' }
    ]
  },
  {
    id: 'reorder-conflict',
    name: 'Reorder Conflict',
    description: 'Test what happens when two devices reorder the same items differently.',
    steps: [
      { id: '1', actor: 'A', entity: 'page', action: 'create', label: 'A creates page 1' },
      { id: '2', actor: 'A', entity: 'page', action: 'create', label: 'A creates page 2' },
      { id: '3', actor: 'A', entity: 'page', action: 'create', label: 'A creates page 3' },
      { id: '4', actor: 'A', action: 'sync', label: 'A syncs to server' },
      { id: '5', actor: 'B', action: 'sync', label: 'B syncs from server' },
      { id: '6', actor: 'A', entity: 'page', action: 'reorder', label: 'A reorders: 3,1,2' },
      { id: '7', actor: 'B', entity: 'page', action: 'reorder', label: 'B reorders: 2,3,1' },
      { id: '8', actor: 'A', action: 'sync', label: 'A syncs reorder' },
      { id: '9', actor: 'B', action: 'sync', label: 'B syncs reorder' }
    ]
  },
  {
    id: 'offline-create',
    name: 'Offline Create & Sync',
    description: 'Test that items created offline are pushed to server when online. Local unsynced data ALWAYS wins over backend absence.',
    steps: [
      { id: '1', actor: 'A', action: 'offline', label: 'A goes offline' },
      { id: '2', actor: 'A', entity: 'book', action: 'create', label: 'A creates book while offline' },
      { id: '3', actor: 'A', entity: 'page', action: 'create', label: 'A creates page 1 while offline' },
      { id: '4', actor: 'A', entity: 'page', action: 'create', label: 'A creates page 2 while offline' },
      { id: '5', actor: 'A', action: 'online', label: 'A comes back online' },
      { id: '6', actor: 'A', action: 'sync', label: 'A syncs - should push local items to server' },
      { id: '7', actor: 'B', action: 'sync', label: 'B syncs - should receive all items from A' }
    ]
  }
];

// Simple toast notification system
let toastTimeouts: NodeJS.Timeout[] = [];

const showToast = (message: string, duration = 3000) => {
  // Clear existing toasts
  toastTimeouts.forEach(clearTimeout);
  toastTimeouts = [];

  // Create toast element
  const existingToast = document.getElementById('sync-debug-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'sync-debug-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
  `;

  document.body.appendChild(toast);

  // Auto remove after duration
  const timeout = setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    toastTimeouts = toastTimeouts.filter(t => t !== timeout);
  }, duration);

  toastTimeouts.push(timeout);
};

type Props = {
  books: any[];
  bookmarks: RichBookmark[];
  onCreateBook: (parentId: string | null, name: string) => void;
  onCreatePage: (title: string, url: string, description: string | null, bookId: string | null, tags?: string[]) => Promise<void>;
};

export function SyncDebugPanel({ books: propBooks, bookmarks, onCreateBook, onCreatePage }: Props) {
  // Use the same data as the main app (from props) instead of CouchDB store
  const books = propBooks; // Use books from main app
  const pages = bookmarks; // Use bookmarks from main app (pages are bookmarks)

  // Use the CouchDB store for sync functionality
  const { syncWithRemote } = useBookmarksStore();

  // Drag and resize functionality
  const [position, setPosition] = useState(() => {
    // Start in bottom right of screen by default
    const defaultX = window.innerWidth - 340; // 320px width + 20px margin
    const defaultY = window.innerHeight - 620; // 600px height + 20px margin
    return { x: Math.max(20, defaultX), y: Math.max(20, defaultY) };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 320, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 320, height: 600 });

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Make the entire header area draggable
    const target = e.target as HTMLElement;
    if (target.closest('.drag-header')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Keep panel within viewport bounds
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }

    if (isResizing) {
      const newWidth = Math.max(280, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(400, resizeStart.height + (e.clientY - resizeStart.y));

      setSize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    e.preventDefault();
    e.stopPropagation();
  };

  // Add global mouse event listeners
  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'grabbing' : 'nw-resize';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, isResizing]);

  // Function to trigger sync after API operations
  const triggerSync = async () => {
    try {
      await syncWithRemote();
      showToast('✅ Sync triggered successfully after API operation');
    } catch (error) {
      showToast('❌ Sync failed after API operation');
    }
  };

  // Component re-renders with updated data from props

  // Use the same functions passed from App
  const createBook = async (input: { title: string; emoji?: string | null }) => {
    onCreateBook(null, input.title); // null = root level
  };

  const createPage = async (input: { bookId?: string | null; title: string; content?: string }) => {
    // Create with a dummy URL to ensure it shows up in UI
    const dummyUrl = `https://example.com/${Date.now()}`;
    await onCreatePage(input.title, dummyUrl, null, input.bookId || null, []);
  };

  // Backend API functions for CouchDB
  const createBookViaAPI = async () => {
    try {
      const title = generateRandomTitle();
      console.log('🔄 Creating book via CouchDB API:', title);

      // Call the books API directly (bypass proxy for now)
      const response = await fetch('http://localhost:4000/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          emoji: null
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Book created via API:', result);

      showToast(`✅ Book created in CouchDB: ${title}\nNow manually sync to pull into local storage`);
    } catch (error: unknown) {
      console.error('❌ Failed to create book via API:', error);
      showToast(`❌ API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const createPageViaAPI = async () => {
    try {
      let bookId: string | null = null;
      let bookTitle = '';

      if (books.length > 0) {
        // Add to a random existing book
        const randomBook = books[Math.floor(Math.random() * books.length)];
        bookId = randomBook.id;
        bookTitle = randomBook.title;
      }

      const pageTitle = generateRandomTitle();
      const dummyUrl = `https://example.com/${Date.now()}`;

      console.log('🔄 Creating page via CouchDB API:', pageTitle);

      const response = await fetch('http://localhost:4000/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pageTitle,
          url: dummyUrl,
          bookId,
          content: null
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Page created via API:', result);

      showToast(`✅ Page created in CouchDB: ${pageTitle}\nNow manually sync to pull into local storage`);
    } catch (error: unknown) {
      console.error('❌ Failed to create page via API:', error);
      showToast(`❌ API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Get store state and functions
  const { deleteLocalDataOnly, resetAccount, pendingMutations, syncPaused, pauseSync, resumeSync, isSyncing } = useBookmarksStore();

  // Delete functions - now handled by store functions
  // deleteLocalData, deleteLocalDataOnly, and resetAccount are now in the store

  const deleteBackendData = async () => {
    try {
      console.log('🔄 Deleting all backend data (fetching fresh list)...');

      let totalDeleted = 0;
      let totalErrors = 0;

      // Function to delete all items of a type
      const deleteAllItems = async (endpoint: string, itemType: string) => {
        try {
          console.log(`🗑️ Fetching current ${itemType} list from backend...`);

          // Fetch fresh list from backend
          const response = await fetch(`http://localhost:4000/${endpoint}`, {
            method: 'GET'
          });

          if (!response.ok) {
            console.warn(`⚠️ Failed to fetch ${itemType} list:`, response.status);
            return;
          }

          const data = await response.json();
          const items = data[endpoint] || data.books || data.pages || [];
          console.log(`📋 Found ${items.length} ${itemType} to delete`);

          // Delete each item
          for (const item of items) {
            try {
              // Debug: Log the item details
              console.log(`🔍 Deleting ${itemType} item:`, {
                id: item._id || item.id,
                title: item.title || item.name,
                fullItem: item
              });

              const deleteResponse = await fetch(`http://localhost:4000/${endpoint}/${item._id || item.id}`, {
                method: 'DELETE'
              });

              if (deleteResponse.ok) {
                console.log(`✅ Deleted ${itemType}: ${item.title || item.name || item.id}`);
                totalDeleted++;
              } else if (deleteResponse.status === 404) {
                console.log(`ℹ️ ${itemType} already deleted: ${item.id}`);
                totalDeleted++; // Count as deleted even if already gone
              } else {
                const errorText = await deleteResponse.text();
                console.warn(`⚠️ Failed to delete ${itemType} ${item.id}: ${deleteResponse.status} - ${errorText}`);
                totalErrors++;
              }
            } catch (error) {
              console.warn(`⚠️ Error deleting ${itemType} ${item.id}:`, error);
              totalErrors++;
            }
          }
        } catch (error) {
          console.error(`❌ Failed to delete ${itemType}:`, error);
        }
      };

      // Delete all books and pages
      await deleteAllItems('books', 'books');
      await deleteAllItems('pages', 'pages');

      // Trigger sync to update local store
      await triggerSync();

      const message = totalErrors > 0
        ? `🗑️ Deleted ${totalDeleted} items (${totalErrors} errors)`
        : `🗑️ All backend data deleted (${totalDeleted} items)`;

      showToast(message);
      console.log(`🗑️ Backend delete complete: ${totalDeleted} deleted, ${totalErrors} errors`);
    } catch (error: unknown) {
      console.error('❌ Failed to delete backend data:', error);
      showToast(`❌ Delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const deleteAllData = async () => {
    try {
      console.log('🔄 Deleting ALL data (local + backend)...');

      // Delete backend data first
      await deleteBackendData();

      // Delete local data
      await deleteLocalDataOnly();

      showToast('🗑️ ALL data deleted (local + backend)');
    } catch (error: unknown) {
      console.error('❌ Failed to delete all data:', error);
      showToast(`❌ Delete all failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Use real data from the store
  const { isInitialized, syncError, lastSyncAt, initializeCouchDB } = useBookmarksStore();

  // Mock function for the sync button (different name to avoid conflict)
  const manualSync = async () => {
    try {
      await syncWithRemote();
      showToast('🔄 Manual sync completed');
    } catch (error) {
      showToast('❌ Manual sync failed');
    }
  };

  const [showDetails, setShowDetails] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [showMutations, setShowMutations] = useState(false);
  const [showTombstones, setShowTombstones] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [executedSteps, setExecutedSteps] = useState<ExecutedStep[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunningScenario, setIsRunningScenario] = useState(false);

  // Random data generation functions
  const generateRandomTitle = () => {
    const adjectives = ['Amazing', 'Fantastic', 'Great', 'Awesome', 'Super', 'Cool', 'Epic', 'Legendary', 'Mighty', 'Powerful'];
    const nouns = ['Project', 'Idea', 'Concept', 'Plan', 'Strategy', 'Journey', 'Adventure', 'Quest', 'Mission', 'Task'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  };

  const generateRandomEmoji = () => {
    const emojis = ['📚', '📖', '📝', '✨', '🚀', '⭐', '🔥', '💡', '🎯', '🌟'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  };

  const generateRandomContent = () => {
    const contents = [
      'This is some sample content for testing purposes.',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Here is a bookmark with some interesting information.',
      'This page contains useful notes and references.',
      'Sample text for development and testing.'
    ];
    return contents[Math.floor(Math.random() * contents.length)];
  };

  const addRandomBook = async () => {
    try {
      const title = generateRandomTitle();
      onCreateBook(null, title);
      console.log('📖 [SyncDebugPanel] Created book:', title);
      console.log('📊 [SyncDebugPanel] Books after creation:', books.length, books.map(b => b.title));
      showToast(`✅ Created book: ${title}`);
    } catch (error: unknown) {
      console.error('❌ [SyncDebugPanel] Failed to create book:', error);
      showToast(`❌ Failed to create book: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const addRandomPage = async () => {
    try {
      let bookId: string | null = null;
      let bookTitle = '';

      if (books.length > 0) {
        // Add to a random existing book
        const randomBook = books[Math.floor(Math.random() * books.length)];
        bookId = randomBook.id;
        bookTitle = randomBook.title;
      } else {
        // No books, create one first
        const title = generateRandomTitle();
        onCreateBook(null, title);
        // Find the newly created book
        const newBook = books.find(b => b.title === title);
        if (newBook) {
          bookId = newBook.id;
          bookTitle = newBook.title;
        }
        console.log('📖 [SyncDebugPanel] Created book for page:', title);
      }

      const pageTitle = generateRandomTitle();
      const dummyUrl = `https://example.com/${Date.now()}`;
      await onCreatePage(pageTitle, dummyUrl, null, bookId, []);

      console.log('📄 [SyncDebugPanel] Created page:', pageTitle, 'in book:', bookTitle);
      showToast(`✅ Created page: ${pageTitle}`);
    } catch (error: unknown) {
      console.error('❌ [SyncDebugPanel] Failed to create page:', error);
      showToast(`❌ Failed to create page: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Scenario Simulator Functions
  const runNextStep = async () => {
    if (!currentScenario || isRunningScenario || currentStepIndex >= currentScenario.steps.length) {
      return;
    }

    setIsRunningScenario(true);

    try {
      const step = currentScenario.steps[currentStepIndex];

      // Execute the step based on actor and action
      if (step.action === 'sync') {
        console.log(`🎭 Executing step: ${step.actor} syncs`);
        await triggerSync();
      } else if (step.action === 'create' && step.entity) {
        console.log(`🎭 Executing step: ${step.actor} creates ${step.entity}`);
        if (step.entity === 'page') {
          await createPage({ bookId: undefined, title: `Test Page ${Date.now()}` });
        } else if (step.entity === 'book') {
          await createBook({ title: `Test Book ${Date.now()}` });
        }
      } else if (step.action === 'delete-local' && step.entity) {
        console.log(`🎭 Executing step: ${step.actor} deletes ${step.entity} locally`);
        // For now, just delete all local data as a placeholder
        await deleteLocalDataOnly();
      } else {
        console.log(`🎭 Skipping unsupported step: ${step.action}`);
      }

      // Mark step as executed
      const executedStep: ExecutedStep = {
        step,
        status: 'executed'
      };

      setExecutedSteps(prev => [...prev, executedStep]);
      setCurrentStepIndex(prev => prev + 1);

      // Capture snapshot
      const snapshot: Snapshot = {
        stepId: step.id,
        label: step.label || `${step.actor} ${step.action}`,
        createdAt: new Date().toISOString(),
        localA: { books: books.length, pages: pages.length },
        localB: { books: 0, pages: 0 }, // Placeholder for multi-device
        couchdb: { status: 'connected' },
        mutationsA: pendingMutations,
        mutationsB: [],
        tombstonesA: [],
        tombstonesB: []
      };

      setSnapshots(prev => [...prev, snapshot]);

    } catch (error) {
      console.error('❌ Scenario step failed:', error);

      const executedStep: ExecutedStep = {
        step: currentScenario.steps[currentStepIndex],
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };

      setExecutedSteps(prev => [...prev, executedStep]);
    } finally {
      setIsRunningScenario(false);
    }
  };

  const runAllSteps = async () => {
    if (!currentScenario) return;

    for (let i = currentStepIndex; i < currentScenario.steps.length; i++) {
      await runNextStep();
    }
  };

  const resetScenario = () => {
    setExecutedSteps([]);
    setSnapshots([]);
    setCurrentStepIndex(0);
    setIsRunningScenario(false);
  };

  return (
    <div
      className="fixed rounded-md bg-neutral-900/95 text-neutral-100 text-xs shadow-lg border border-neutral-700 z-50 overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        minWidth: 280,
        minHeight: 400
      }}
    >
      {/* Drag Handle */}
      <div
        className="drag-header drag-handle cursor-grab active:cursor-grabbing p-3 border-b border-neutral-700"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold tracking-wide">CouchDB</span>
          <div className="flex gap-1">
            {!isInitialized && (
              <button
                onClick={initializeCouchDB}
                className="px-2 py-0.5 rounded border border-green-500 hover:bg-green-800 text-green-400"
              >
                Init
              </button>
            )}
            {syncPaused ? (
              <button
                onClick={resumeSync}
                disabled={!isInitialized}
                className="px-2 py-0.5 rounded border border-green-500 hover:bg-green-700 disabled:opacity-50"
                title="Resume background sync"
              >
                ▶️
              </button>
            ) : (
              <button
                onClick={pauseSync}
                disabled={!isInitialized}
                className="px-2 py-0.5 rounded border border-yellow-500 hover:bg-yellow-700 disabled:opacity-50"
                title="Pause background sync"
              >
                ⏸️
              </button>
            )}
            <button
              onClick={syncWithRemote}
              disabled={isSyncing || !isInitialized}
              className="px-2 py-0.5 rounded border border-neutral-500 hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSyncing ? "Syncing…" : "Sync"}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto" style={{ height: size.height - 60 }}>
        <div className="p-3 space-y-2">
          <div className="space-y-1">
            <div>
              <span className="text-neutral-400">Status:</span>{" "}
              <span
                className={
                  !isInitialized
                    ? "text-yellow-400"
                    : syncError
                    ? "text-red-400"
                    : isSyncing
                    ? "text-amber-300"
                    : "text-emerald-300"
                }
              >
                {!isInitialized ? "Not initialized" : syncError ? "Error" : isSyncing ? "Syncing" : "Ready"}
              </span>
            </div>

            <div>
              <span className="text-neutral-400">Books:</span>{" "}
              <span>{books.length}</span>
            </div>

            <div>
              <span className="text-neutral-400">Pages:</span>{" "}
              <span>{pages.length}</span>
            </div>

            {syncError && (
              <div className="text-red-400">
                Error: <span>{syncError}</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="border-t border-neutral-700 pt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
            >
              <span>{showDetails ? "▼" : "▶"}</span>
              <span>Details</span>
            </button>

            {showDetails && (
              <div className="mt-2 space-y-2">
                {/* Local Creation (In-Memory) */}
                <div className="space-y-1">
                  <div className="text-neutral-500 text-xs">Local (In-Memory):</div>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={addRandomBook}
                      className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
                      title="Add random book locally (in-memory)"
                    >
                      + Book
                    </button>
                    <button
                      onClick={addRandomPage}
                      className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                      title="Add random page locally (in-memory)"
                    >
                      + Page
                    </button>
                  </div>
                </div>

                {/* Backend Creation (CouchDB API) */}
                <div className="space-y-1">
                  <div className="text-neutral-500 text-xs">Backend (CouchDB API):</div>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={createBookViaAPI}
                      className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
                      title="Create book directly in CouchDB via API"
                    >
                      + Book
                    </button>
                    <button
                      onClick={createPageViaAPI}
                      className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded"
                      title="Create page directly in CouchDB via API"
                    >
                      + Page
                    </button>
                  </div>
                  <div className="text-neutral-400 text-xs">
                    Status: 🟢 API endpoints ready
                  </div>
                </div>

                {/* Delete Operations */}
                <div className="space-y-1">
                  <div className="text-neutral-500 text-xs">Delete Operations:</div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={deleteLocalDataOnly}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                      title="Delete all local bookmark data"
                    >
                      Del Local
                    </button>
                    <button
                      onClick={deleteBackendData}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                      title="Delete all backend (CouchDB) data"
                    >
                      Del Backend
                    </button>
                    <button
                      onClick={deleteAllData}
                      className="px-2 py-1 text-xs bg-red-800 hover:bg-red-900 rounded"
                      title="Delete ALL data (local + backend)"
                    >
                      Del All
                    </button>
                  </div>
                </div>

                <button
                  onClick={deleteLocalDataOnly}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                  title="Delete all local bookmark data (books/pages)"
                >
                  Delete Local Data
                </button>
                <button
                  onClick={resetAccount}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                  title="Reset account to default data"
                >
                  Reset Account
                </button>

                {/* Recently Created Items (Expandable) */}
                {(books.length > 0 || pages.length > 0) && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setShowRecent(!showRecent)}
                      className="text-neutral-500 hover:text-neutral-300 text-xs flex items-center gap-1"
                    >
                      <span>{showRecent ? "▼" : "▶"}</span>
                      <span>Recently Created ({Math.min(10, books.length + pages.length)})</span>
                    </button>

                    {showRecent && (
                      <div className="space-y-2">
                        {/* Combined recent items sorted by creation time */}
                        {(() => {
                          const allItems = [
                            ...books.map(book => ({
                              ...book,
                              type: 'book' as const,
                              displayName: book.title,
                              icon: book.emoji || '📖',
                              source: 'local' as 'local' | 'backend' // Can be local or backend
                            })),
                            ...pages.map(page => ({
                              ...page,
                              type: 'page' as const,
                              displayName: page.title,
                              icon: '📄',
                              source: 'local' as 'local' | 'backend' // Can be local or backend
                            }))
                          ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

                          const recentItems = allItems.slice(0, 10);

                          return recentItems.length > 0 ? (
                            <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded max-h-32 overflow-y-auto">
                              <div className="font-semibold mb-2">🕐 Recently Created Items:</div>
                              {recentItems.map((item, index) => (
                                <div key={`${item.type}-${item.id}`} className="text-xs mb-1 flex items-center gap-1">
                                  <span>{item.icon}</span>
                                  <span className="truncate flex-1">{item.displayName}</span>
                                  <span className={`text-xs px-1 rounded ${
                                    item.source === 'backend' ? 'bg-purple-600' :
                                    item.source === 'local' ? 'bg-green-600' : 'bg-neutral-600'
                                  }`}>
                                    {item.source === 'backend' ? 'API' : item.source === 'local' ? 'Local' : item.source}
                                  </span>
                                  <span className="text-neutral-500 text-xs">
                                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-neutral-500 text-xs bg-neutral-800 p-2 rounded">
                              No items created yet
                            </div>
                          );
                        })()}

                        {/* Separate sections for books and pages */}
                        <div className="grid grid-cols-2 gap-2">
                          {books.length > 0 && (
                            <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded max-h-20 overflow-y-auto">
                              <div className="font-semibold mb-1">📚 Books ({books.length}):</div>
                              {books.slice(-3).map((book) => (
                                <div key={book.id} className="text-xs truncate">
                                  {book.emoji || '📖'} {book.title}
                                </div>
                              ))}
                            </div>
                          )}

                          {pages.length > 0 && (
                            <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded max-h-20 overflow-y-auto">
                              <div className="font-semibold mb-1">📄 Pages ({pages.length}):</div>
                              {pages.slice(-3).map((page) => (
                                <div key={page.id} className="text-xs truncate">
                                  {page.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mutation Queue Inspector */}
          <div className="border-t border-neutral-700 pt-2">
            <button
              onClick={() => setShowMutations(!showMutations)}
              className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
            >
              <span>{showMutations ? "▼" : "▶"}</span>
              <span>Mutation Queue ({pendingMutations.length})</span>
            </button>

            {showMutations && (
              <div className="mt-2 space-y-2">
                <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded max-h-40 overflow-y-auto">
                  <div className="font-semibold mb-2">🔄 Pending Mutations:</div>
                  {pendingMutations.length === 0 ? (
                    <div className="text-neutral-500">No pending mutations</div>
                  ) : (
                    pendingMutations.map((mutation) => (
                      <div key={mutation.id} className="text-xs mb-2 p-2 bg-neutral-700 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{mutation.type.toUpperCase()} {mutation.entity}</span>
                          <span className={`px-1 rounded text-xs ${
                            mutation.synced ? 'bg-green-600' : 'bg-yellow-600'
                          }`}>
                            {mutation.synced ? 'synced' : 'pending'}
                          </span>
                        </div>
                        <div className="text-neutral-400">ID: {mutation.id}</div>
                        <div className="text-neutral-400">Time: {new Date(mutation.timestamp).toLocaleTimeString()}</div>
                        {mutation.data && Object.keys(mutation.data).length > 0 && (
                          <div className="text-neutral-400 mt-1">
                            Data: {JSON.stringify(mutation.data).slice(0, 50)}...
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tombstone Inspector */}
          <div className="border-t border-neutral-700 pt-2">
            <button
              onClick={() => setShowTombstones(!showTombstones)}
              className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
            >
              <span>{showTombstones ? "▼" : "▶"}</span>
              <span>Tombstones</span>
            </button>

            {showTombstones && (
              <div className="mt-2 space-y-2">
                <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded">
                  <div className="font-semibold mb-2">🪦 Tombstone Inspector:</div>
                  <div className="text-neutral-500 mb-2">
                    Tombstones are deleted items that persist for sync purposes.
                    They contain metadata about when and why items were deleted.
                  </div>

                  {/* Local Tombstones (from store) */}
                  <div className="mb-3">
                    <div className="font-medium mb-1">Local Tombstones:</div>
                    <div className="text-neutral-500 text-xs">
                      No local tombstone tracking implemented yet.
                      Items are marked deleted: true in the store.
                    </div>
                  </div>

                  {/* Backend Tombstones */}
                  <div>
                    <div className="font-medium mb-1">Backend Tombstones (CouchDB):</div>
                    <div className="text-neutral-500 text-xs">
                      Deleted documents in CouchDB with _deleted: true.
                      View in CouchDB admin: http://localhost:5984/_utils/
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sync Scenario Simulator */}
          <div className="border-t border-neutral-700 pt-2">
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
            >
              <span>{showSimulator ? "▼" : "▶"}</span>
              <span>Scenario Simulator</span>
            </button>

            {showSimulator && (
              <div className="mt-2 space-y-2">
                <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded">
                  <div className="font-semibold mb-2">🎭 Sync Scenario Simulator:</div>
                  <div className="text-neutral-500 mb-3 text-xs">
                    Test complex sync scenarios with multiple actors and steps.
                    See state changes at each step for debugging conflicts.
                  </div>

                  {/* Preset Scenarios */}
                  <div className="mb-3">
                    <div className="font-medium mb-2">📋 Preset Scenarios:</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => setCurrentScenario(scenarios.find(s => s.id === 'edit-vs-delete') || null)}
                        className="block w-full text-left px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        Edit vs Delete Conflict
                      </button>
                      <button
                        onClick={() => setCurrentScenario(scenarios.find(s => s.id === 'offline-deletes') || null)}
                        className="block w-full text-left px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
                      >
                        Offline Deletes
                      </button>
                      <button
                        onClick={() => setCurrentScenario(scenarios.find(s => s.id === 'reorder-conflict') || null)}
                        className="block w-full text-left px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
                      >
                        Reorder Conflict
                      </button>
                    </div>
                  </div>

                  {/* Current Scenario */}
                  {currentScenario && (
                    <div className="mb-3">
                      <div className="font-medium mb-2">🎯 Current Scenario: {currentScenario.name}</div>
                      {currentScenario.description && (
                        <div className="text-neutral-400 text-xs mb-2">{currentScenario.description}</div>
                      )}

                      {/* Timeline View */}
                      <div className="mb-3">
                        <div className="font-medium mb-2">⏱️ Timeline:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {currentScenario.steps.map((step, index) => {
                            const executedStep = executedSteps.find(es => es.step.id === step.id);
                            return (
                              <div key={step.id} className="flex items-center gap-2 text-xs">
                                <span className="font-mono">{index + 1}.</span>
                                <span className={`px-1 rounded text-xs ${
                                  executedStep?.status === 'executed' ? 'bg-green-600' :
                                  executedStep?.status === 'error' ? 'bg-red-600' : 'bg-neutral-600'
                                }`}>
                                  {executedStep?.status || 'pending'}
                                </span>
                                <span>{step.label || `${step.actor} ${step.action}`}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex gap-1 mb-3">
                        <button
                          onClick={() => runNextStep()}
                          disabled={isRunningScenario || currentStepIndex >= currentScenario.steps.length}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
                        >
                          {isRunningScenario ? 'Running...' : 'Run Next'}
                        </button>
                        <button
                          onClick={() => runAllSteps()}
                          disabled={isRunningScenario || currentScenario.steps.length === 0}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded"
                        >
                          Run All
                        </button>
                        <button
                          onClick={() => resetScenario()}
                          className="px-2 py-1 text-xs bg-neutral-600 hover:bg-neutral-700 rounded"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Snapshot Viewer */}
                  {snapshots.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">📸 State Snapshots:</div>
                      <div className="space-y-1">
                        {snapshots.map((snapshot, index) => (
                          <div key={snapshot.stepId} className="text-xs">
                            <div className="font-medium">Step {index + 1}: {snapshot.label}</div>
                            <div className="text-neutral-400 pl-2">
                              Books A: {(snapshot.localA as any)?.books?.length || 0} |
                              Books B: {(snapshot.localB as any)?.books?.length || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-50 hover:opacity-100"
        onMouseDown={handleResizeMouseDown}
        style={{
          background: 'linear-gradient(-45deg, transparent 0%, transparent 30%, rgba(156, 163, 175, 0.5) 30%, rgba(156, 163, 175, 0.5) 35%, transparent 35%, transparent 65%, rgba(156, 163, 175, 0.5) 65%, rgba(156, 163, 175, 0.5) 70%, transparent 70%)'
        }}
      />
    </div>
  );
}
