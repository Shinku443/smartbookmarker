import React, { useState, useRef } from "react";
import { EnhancedBookmarkImporter, ImportResult, ImportProgress, ExportOptions } from "@smart/core";
import { Button } from "../ui/Button";
import { RichBookmark } from "../../models/RichBookmark";
import { Book } from "../../models/Book";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (bookmarks: RichBookmark[]) => Promise<void>;
  onImportBookmarks: (bookmarks: RichBookmark[], onProgress?: (progress: { current: number; total: number; currentItem?: string }) => void, onCancel?: () => boolean) => Promise<void>;
  bookmarks: RichBookmark[];
  books: Book[];
}

/**
 * ImportExportModal Component
 * ---------------------------
 * Modal for importing and exporting bookmarks with multiple format support
 */
export default function ImportExportModal({
  isOpen,
  onClose,
  onImport,
  onImportBookmarks,
  bookmarks,
  books
}: ImportExportModalProps) {
  const [mode, setMode] = useState<'import' | 'export'>('import');
  const [importFormat, setImportFormat] = useState<'html' | 'chrome' | 'firefox'>('html');
  const [exportFormat, setExportFormat] = useState<'html' | 'json' | 'csv' | 'markdown'>('html');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; currentItem?: string } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cancelImport, setCancelImport] = useState<(() => void) | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'html',
    includeTags: true,
    includeDescriptions: true,
    includeDates: true,
    folderStructure: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setProgress(null);
      setImportResult(null);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(null);
    setImportResult(null);
    setImportProgress(null);

    // Set up cancel callback
    let cancelled = false;
    const cancelCallback = () => cancelled;
    setCancelImport(() => () => { cancelled = true; });

    try {
      const text = await selectedFile.text();

      // Phase 1: Parsing
      setImportProgress({ current: 0, total: 1, currentItem: 'Parsing bookmark file...' });

      const importer = new EnhancedBookmarkImporter({
        onProgress: (parseProgress) => {
          if (!cancelled) {
            setImportProgress({
              current: 0,
              total: 1,
              currentItem: `Parsing bookmarks... (${parseProgress.processed}/${parseProgress.total})`
            });
          }
        },
        detectDuplicates: true,
        skipInvalid: true
      });

      let result: ImportResult;

      switch (importFormat) {
        case 'html':
          console.log('🔍 IMPORT DEBUG: About to call importer.importFromHtml with text length:', text.length);
          result = await importer.importFromHtml(text);
          console.log('🔍 IMPORT DEBUG: importFromHtml returned:', result);
          break;
        case 'chrome':
          result = await importer.importFromChromeJson(text);
          break;
        case 'firefox':
          result = await importer.importFromFirefoxJson(text);
          break;
        default:
          throw new Error(`Unsupported import format: ${importFormat}`);
      }

      if (cancelled) {
        console.log('Import was cancelled');
        return;
      }

      // Phase 2: Import with progress
      const totalBookmarks = result.bookmarks.length;
      setImportProgress({ current: 0, total: totalBookmarks, currentItem: 'Preparing import...' });

      // Convert to RichBookmark format
      const richBookmarks: RichBookmark[] = result.bookmarks.map(b => ({
        ...b,
        pinned: false,
        bookId: b.bookId || null
      }));

      await onImportBookmarks(
        richBookmarks,
        (progress) => {
          if (!cancelled) {
            setImportProgress({
              current: progress.current,
              total: totalBookmarks,
              currentItem: progress.currentItem || `Importing bookmarks... (${progress.current}/${progress.total})`
            });
          }
        },
        cancelCallback
      );

      if (!cancelled) {
        setImportProgress({ current: totalBookmarks, total: totalBookmarks, currentItem: 'Import complete!' });
        setImportResult(result);
        // Auto-close modal after successful import
        setTimeout(() => {
          handleClose();
        }, 1500);
      }

    } catch (error) {
      if (!cancelled) {
        console.error('Import failed:', error);
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsProcessing(false);
      setCancelImport(null);
    }
  };

  const handleExport = () => {
    try {
      const importer = new EnhancedBookmarkImporter();
      const exportData = importer.exportBookmarks(bookmarks, books, {
        ...exportOptions,
        format: exportFormat
      });

      // Create and download file
      const blob = new Blob([exportData], {
        type: exportFormat === 'json' ? 'application/json' :
              exportFormat === 'csv' ? 'text/csv' :
              exportFormat === 'markdown' ? 'text/markdown' : 'text/html'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks-export.${exportFormat === 'markdown' ? 'md' : exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetModal = () => {
    setProgress(null);
    setImportProgress(null);
    setImportResult(null);
    setIsProcessing(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-emperor-surface rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emperor-border">
          <h2 className="text-xl font-semibold text-emperor-text">
            {mode === 'import' ? 'Import Bookmarks' : 'Export Bookmarks'}
          </h2>
          <button
            onClick={handleClose}
            className="text-emperor-muted hover:text-emperor-text text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex border-b border-emperor-border">
          <button
            onClick={() => { setMode('import'); resetModal(); }}
            className={`flex-1 py-3 px-6 text-sm font-medium ${
              mode === 'import'
                ? 'border-b-2 border-emperor-accent text-emperor-accent'
                : 'text-emperor-muted hover:text-emperor-text'
            }`}
          >
            Import
          </button>
          <button
            onClick={() => { setMode('export'); resetModal(); }}
            className={`flex-1 py-3 px-6 text-sm font-medium ${
              mode === 'export'
                ? 'border-b-2 border-emperor-accent text-emperor-accent'
                : 'text-emperor-muted hover:text-emperor-text'
            }`}
          >
            Export
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {mode === 'import' ? (
            <div className="space-y-6">
              {/* Import Format Selection */}
              <div>
                <h3 className="text-sm font-medium mb-3">Import Format</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'html', label: 'HTML (Netscape)', desc: 'Chrome, Firefox, Safari' },
                    { value: 'chrome', label: 'Chrome JSON', desc: 'Chrome bookmarks file' },
                    { value: 'firefox', label: 'Firefox JSON', desc: 'Firefox bookmarks file' }
                  ].map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setImportFormat(format.value as any)}
                      className={`p-3 border rounded-lg text-left ${
                        importFormat === format.value
                          ? 'border-emperor-accent bg-emperor-surfaceStrong'
                          : 'border-emperor-border hover:bg-emperor-surface'
                      }`}
                    >
                      <div className="font-medium text-sm">{format.label}</div>
                      <div className="text-xs text-emperor-muted mt-1">{format.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Selection */}
              <div>
                <h3 className="text-sm font-medium mb-3">Select File</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={importFormat === 'html' ? '.html,.htm' : '.json'}
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                  className="w-full p-3 border border-emperor-border rounded-lg bg-emperor-surface file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-emperor-accent file:text-white file:cursor-pointer"
                />
              </div>

              {/* Progress */}
              {importProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{isProcessing ? 'Importing...' : 'Complete'}</span>
                    <span>{importProgress.current}/{importProgress.total}</span>
                  </div>
                  <div className="w-full bg-emperor-border rounded-full h-2">
                    <div
                      className="bg-emperor-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  {importProgress.currentItem && (
                    <div className="text-xs text-emperor-muted truncate">
                      {importProgress.currentItem}
                    </div>
                  )}
                  {cancelImport && (
                    <div className="flex justify-center mt-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => cancelImport()}
                      >
                        Cancel Import
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className="p-4 bg-emperor-surfaceStrong rounded-lg">
                  <h4 className="font-medium mb-2">Import Complete</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total: <span className="font-medium">{importResult.stats.total}</span></div>
                    <div>Imported: <span className="font-medium text-green-600">{importResult.stats.imported}</span></div>
                    <div>Duplicates: <span className="font-medium text-yellow-600">{importResult.stats.duplicates}</span></div>
                    <div>Errors: <span className="font-medium text-red-600">{importResult.stats.errors}</span></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Export Format Selection */}
              <div>
                <h3 className="text-sm font-medium mb-3">Export Format</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'html', label: 'HTML', desc: 'Standard bookmark format' },
                    { value: 'json', label: 'JSON', desc: 'Structured data' },
                    { value: 'csv', label: 'CSV', desc: 'Spreadsheet format' },
                    { value: 'markdown', label: 'Markdown', desc: 'Readable text format' }
                  ].map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setExportFormat(format.value as any)}
                      className={`p-3 border rounded-lg text-left ${
                        exportFormat === format.value
                          ? 'border-emperor-accent bg-emperor-surfaceStrong'
                          : 'border-emperor-border hover:bg-emperor-surface'
                      }`}
                    >
                      <div className="font-medium text-sm">{format.label}</div>
                      <div className="text-xs text-emperor-muted mt-1">{format.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              <div>
                <h3 className="text-sm font-medium mb-3">Export Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeTags}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, includeTags: e.target.checked }))}
                      className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                    />
                    <span className="text-sm">Include tags</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeDates}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, includeDates: e.target.checked }))}
                      className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                    />
                    <span className="text-sm">Include dates</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeDescriptions}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, includeDescriptions: e.target.checked }))}
                      className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                    />
                    <span className="text-sm">Include descriptions</span>
                  </label>
                </div>
              </div>

              {/* Export Summary */}
              <div className="p-4 bg-emperor-surfaceStrong rounded-lg">
                <h4 className="font-medium mb-2">Export Summary</h4>
                <div className="text-sm text-emperor-muted">
                  <div>Bookmarks: <span className="font-medium">{bookmarks.length}</span></div>
                  <div>Books: <span className="font-medium">{books.length}</span></div>
                  <div>Format: <span className="font-medium">{exportFormat.toUpperCase()}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-emperor-border">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          {mode === 'import' && selectedFile && (
            <Button onClick={handleImportSubmit} disabled={isProcessing}>
              {isProcessing ? 'Importing...' : `Import ${selectedFile.name}`}
            </Button>
          )}
          {mode === 'export' && (
            <Button onClick={handleExport} disabled={bookmarks.length === 0}>
              Export {bookmarks.length} Bookmarks
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
