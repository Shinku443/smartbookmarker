import React from "react";
import type { EmperorTheme, ThemeMode } from "../hooks/useTheme";
import type { AISettings, AIProvider } from "../hooks/useAISettings";
import type { AppSettings, SortMethod, SortDirection, SyncFrequency, ConflictResolution, SummaryLength, AnalysisDepth } from "../hooks/useAppSettings";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { getSortMethodDisplayName, getSortDirectionDisplayName } from "../utils/bookmarkSorter";

/**
 * SettingsScreen.tsx
 * -------------------
 * Settings UI for the Emperor Library application.
 *
 * Responsibilities:
 *   - Control theme mode (dark / light / system)
 *   - Control accent color
 *   - Control edit mode (inline vs modal)
 *   - Control view mode (card / list / grid)
 *   - Control info visibility (favicon, url, tags, date, etc.)
 *
 * This component is fully controlled by props and contains no persistent state.
 */

export type ViewMode = "card" | "list" | "grid";

export type InfoVisibility = {
  favicon: boolean;
  url: boolean;
  tags: boolean;
  date: boolean;
  book: boolean;
};

type Props = {
  /** Current theme object (mode + accent color) */
  theme: EmperorTheme;
  /** Updates the theme (mode and/or accent) */
  setTheme: (next: EmperorTheme) => void;

  /** Current edit mode for pages */
  editMode: "modal" | "inline";
  /** Updates the edit mode */
  setEditMode: (mode: "modal" | "inline") => void;

  /** Current view mode */
  viewMode: ViewMode;
  /** Updates the view mode */
  setViewMode: (mode: ViewMode) => void;

  /** Current info visibility settings */
  infoVisibility: InfoVisibility;
  /** Updates the info visibility */
  setInfoVisibility: (visibility: InfoVisibility) => void;

  /** Current AI settings */
  aiSettings: AISettings;
  /** Updates the AI settings */
  setAISettings: (next: AISettings) => void;

  /** Current app settings */
  appSettings: AppSettings;
  /** Updates app settings */
  updateAppSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;

  /** Called to close the settings screen and return to the main UI */
  onClose: () => void;
};

/**
 * SettingsScreen Component
 * ------------------------
 * Renders theme and edit mode controls.
 * Includes a color picker for the accent color.
 */
export default function SettingsScreen({
  theme,
  setTheme,
  editMode,
  setEditMode,
  viewMode,
  setViewMode,
  infoVisibility,
  setInfoVisibility,
  aiSettings,
  setAISettings,
  appSettings,
  updateAppSetting,
  onClose
}: Props) {
  function handleModeChange(mode: ThemeMode) {
    setTheme({ ...theme, mode });
  }

  function handleAccentChange(value: string) {
    setTheme({ ...theme, accent: value });
  }

  function handleResetAccent() {
    setTheme({ ...theme, accent: "#fbbf24" });
  }

  function handleProviderChange(provider: AIProvider) {
    setAISettings({ ...aiSettings, provider });
  }

  function handleApiKeyChange(apiKey: string) {
    setAISettings({ ...aiSettings, apiKey });
  }

  function handleUseAIToggle() {
    setAISettings({ ...aiSettings, useAI: !aiSettings.useAI });
  }

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
  }

  function handleVisibilityChange(key: keyof InfoVisibility, value: boolean) {
    setInfoVisibility({ ...infoVisibility, [key]: value });
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-8">
      {/* Header row with Back control */}
      <div className="flex items-center justify-between mb-2">
        <Button size="sm" variant="subtle" onClick={onClose}>
          ← Back
        </Button>
        <span className="text-sm text-emperor-muted">Settings</span>
      </div>

      {/* Theme section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Theme</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Choose how Emperor looks and feels across your library.
        </p>

        <div className="flex flex-col gap-4">
          {/* Theme mode */}
          <div>
            <h3 className="text-sm font-medium mb-2">Mode</h3>
            <div className="flex gap-2">
              {(
                [
                  { label: "System", value: "system" },
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" }
                ] as { label: string; value: ThemeMode }[]
              ).map((option) => {
                const isActive = theme.mode === option.value;
                return (
                  <button
                    key={option.value}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                        : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                    }`}
                    onClick={() => handleModeChange(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <h3 className="text-sm font-medium mb-2">Accent color</h3>
            <p className="text-xs text-emperor-muted mb-2">
              Used for highlights, active states, and important actions.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.accent}
                onChange={(e) => handleAccentChange(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-emperor-border bg-transparent"
              />
              <span className="text-xs text-emperor-muted">
                {theme.accent.toUpperCase()}
              </span>
              <Button size="sm" variant="subtle" onClick={handleResetAccent}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Edit mode section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Editing</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Choose how you prefer to edit pages.
        </p>

        <div className="flex gap-2">
          {(
            [
              { label: "Modal", value: "modal" },
              { label: "Inline", value: "inline" }
            ] as const
          ).map((option) => {
            const isActive = editMode === option.value;
            return (
              <button
                key={option.value}
                className={`text-sm px-3 py-1 rounded-full border ${
                  isActive
                    ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                    : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                }`}
                onClick={() => setEditMode(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* View mode section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">View</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Choose how bookmarks are displayed in your library.
        </p>

        <div>
          <h3 className="text-sm font-medium mb-2">Layout</h3>
          <div className="flex gap-2">
            {(
              [
                { label: "Cards", value: "card" },
                { label: "List", value: "list" },
                { label: "Grid", value: "grid" }
              ] as { label: string; value: ViewMode }[]
            ).map((option) => {
              const isActive = viewMode === option.value;
              return (
                <button
                  key={option.value}
                  className={`text-sm px-3 py-1 rounded-full border ${
                    isActive
                      ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                      : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                  }`}
                  onClick={() => handleViewModeChange(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Info visibility section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Display</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Choose which information to show for each bookmark.
        </p>

        <div className="flex flex-col gap-3">
          {(
            [
              { label: "Favicon", key: "favicon" },
              { label: "URL", key: "url" },
              { label: "Tags", key: "tags" },
              { label: "Date", key: "date" },
              { label: "Book", key: "book" }
            ] as { label: string; key: keyof InfoVisibility }[]
          ).map((option) => (
            <label key={option.key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={infoVisibility[option.key]}
                onChange={(e) => handleVisibilityChange(option.key, e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* AI section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">AI Features</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Configure AI-powered features for smart tagging and content analysis.
        </p>

        <div className="flex flex-col gap-4">
          {/* Enable AI toggle */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiSettings.useAI}
                onChange={handleUseAIToggle}
                className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
              />
              <span className="text-sm font-medium">Enable AI features</span>
            </label>
            <p className="text-xs text-emperor-muted mt-1">
              Use AI for automatic tagging, content summarization, and analysis.
            </p>
          </div>

          {/* AI Provider selection */}
          <div>
            <h3 className="text-sm font-medium mb-2">AI Provider</h3>
            <div className="flex gap-2">
              {(
                [
                  { label: "OpenAI", value: "openai" },
                  { label: "Anthropic", value: "anthropic" },
                  { label: "Groq", value: "groq" },
                  { label: "Local", value: "local" }
                ] as { label: string; value: AIProvider }[]
              ).map((option) => {
                const isActive = aiSettings.provider === option.value;
                return (
                  <button
                    key={option.value}
                    disabled={!aiSettings.useAI}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                        : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                    } ${!aiSettings.useAI ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => handleProviderChange(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key input */}
          <div>
            <h3 className="text-sm font-medium mb-2">API Key</h3>
            <Input
              type="password"
              value={aiSettings.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              disabled={!aiSettings.useAI}
              placeholder="Enter your API key"
              className={`w-full ${!aiSettings.useAI ? "opacity-50" : ""}`}
            />
            <p className="text-xs text-emperor-muted mt-1">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>
        </div>
      </section>

      {/* Sorting & Display section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Sorting & Display</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Configure how bookmarks are sorted and displayed.
        </p>

        <div className="flex flex-col gap-4">
          {/* Default sort method */}
          <div>
            <h3 className="text-sm font-medium mb-2">Default Sort Method</h3>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { label: "Manual", value: "manual" },
                  { label: "Date Added", value: "dateAdded" },
                  { label: "Date Modified", value: "dateModified" },
                  { label: "Alphabetical", value: "alphabetical" },
                  { label: "URL", value: "url" }
                ] as { label: string; value: SortMethod }[]
              ).map((option) => {
                const isActive = appSettings.defaultSortMethod === option.value;
                return (
                  <button
                    key={option.value}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                        : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                    }`}
                    onClick={() => updateAppSetting('defaultSortMethod', option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort direction */}
          <div>
            <h3 className="text-sm font-medium mb-2">Sort Direction</h3>
            <div className="flex gap-2">
              {(
                [
                  { label: "Ascending", value: "asc" },
                  { label: "Descending", value: "desc" }
                ] as { label: string; value: SortDirection }[]
              ).map((option) => {
                const isActive = appSettings.defaultSortDirection === option.value;
                return (
                  <button
                    key={option.value}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                        : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                    }`}
                    onClick={() => updateAppSetting('defaultSortDirection', option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display options */}
          <div>
            <h3 className="text-sm font-medium mb-2">Display Options</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appSettings.compactMode}
                  onChange={(e) => updateAppSetting('compactMode', e.target.checked)}
                  className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                />
                <span className="text-sm">Compact mode</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appSettings.showThumbnails}
                  onChange={(e) => updateAppSetting('showThumbnails', e.target.checked)}
                  className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                />
                <span className="text-sm">Show thumbnails</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Search Settings section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Search Settings</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Configure search behavior and scope.
        </p>

        <div className="flex flex-col gap-4">
          {/* Search scope */}
          <div>
            <h3 className="text-sm font-medium mb-2">Search In</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appSettings.searchInTitle}
                  onChange={(e) => updateAppSetting('searchInTitle', e.target.checked)}
                  className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                />
                <span className="text-sm">Title</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appSettings.searchInUrl}
                  onChange={(e) => updateAppSetting('searchInUrl', e.target.checked)}
                  className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                />
                <span className="text-sm">URL</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appSettings.searchInContent}
                  onChange={(e) => updateAppSetting('searchInContent', e.target.checked)}
                  className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                />
                <span className="text-sm">Content</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appSettings.searchInTags}
                  onChange={(e) => updateAppSetting('searchInTags', e.target.checked)}
                  className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                />
                <span className="text-sm">Tags</span>
              </label>
            </div>
          </div>

          {/* Search options */}
          <div>
            <h3 className="text-sm font-medium mb-2">Search Options</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appSettings.fuzzySearch}
                  onChange={(e) => updateAppSetting('fuzzySearch', e.target.checked)}
                  className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                />
                <span className="text-sm">Fuzzy search</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appSettings.autoSuggestions}
                  onChange={(e) => updateAppSetting('autoSuggestions', e.target.checked)}
                  className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
                />
                <span className="text-sm">Auto-suggestions</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Sync & Backup section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Sync & Backup</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Configure synchronization and data backup preferences.
        </p>

        <div className="flex flex-col gap-4">
          {/* Auto sync */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={appSettings.autoSync}
                onChange={(e) => updateAppSetting('autoSync', e.target.checked)}
                className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
              />
              <span className="text-sm font-medium">Enable auto-sync</span>
            </label>
            <p className="text-xs text-emperor-muted mt-1">
              Automatically sync data with the server.
            </p>
          </div>

          {/* Sync frequency */}
          <div>
            <h3 className="text-sm font-medium mb-2">Sync Frequency</h3>
            <div className="flex gap-2">
              {(
                [
                  { label: "Manual", value: "manual" },
                  { label: "Realtime", value: "realtime" },
                  { label: "Hourly", value: "hourly" },
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" }
                ] as { label: string; value: SyncFrequency }[]
              ).map((option) => {
                const isActive = appSettings.syncFrequency === option.value;
                return (
                  <button
                    key={option.value}
                    disabled={!appSettings.autoSync}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                        : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                    } ${!appSettings.autoSync ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => updateAppSetting('syncFrequency', option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conflict resolution */}
          <div>
            <h3 className="text-sm font-medium mb-2">Conflict Resolution</h3>
            <div className="flex gap-2">
              {(
                [
                  { label: "Manual", value: "manual" },
                  { label: "Local", value: "local" },
                  { label: "Remote", value: "remote" },
                  { label: "Newest", value: "newest" }
                ] as { label: string; value: ConflictResolution }[]
              ).map((option) => {
                const isActive = appSettings.conflictResolution === option.value;
                return (
                  <button
                    key={option.value}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                        : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                    }`}
                    onClick={() => updateAppSetting('conflictResolution', option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Performance section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Performance</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Optimize performance and resource usage.
        </p>

        <div className="flex flex-col gap-4">
          {/* Lazy loading */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={appSettings.lazyLoading}
                onChange={(e) => updateAppSetting('lazyLoading', e.target.checked)}
                className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
              />
              <span className="text-sm font-medium">Lazy loading</span>
            </label>
            <p className="text-xs text-emperor-muted mt-1">
              Load content on demand to improve performance.
            </p>
          </div>

          {/* Virtual scroll buffer */}
          <div>
            <h3 className="text-sm font-medium mb-2">Virtual Scroll Buffer</h3>
            <input
              type="range"
              min="5"
              max="20"
              value={appSettings.virtualScrollBuffer}
              onChange={(e) => updateAppSetting('virtualScrollBuffer', parseInt(e.target.value))}
              className="w-full h-2 bg-emperor-surface border border-emperor-border rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-emperor-muted mt-1">
              <span>5</span>
              <span>{appSettings.virtualScrollBuffer}</span>
              <span>20</span>
            </div>
          </div>

          {/* Cache size */}
          <div>
            <h3 className="text-sm font-medium mb-2">Max Cache Size (MB)</h3>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={appSettings.maxCacheSize}
              onChange={(e) => updateAppSetting('maxCacheSize', parseInt(e.target.value))}
              className="w-full h-2 bg-emperor-surface border border-emperor-border rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-emperor-muted mt-1">
              <span>10MB</span>
              <span>{appSettings.maxCacheSize}MB</span>
              <span>500MB</span>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Analytics section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Privacy & Analytics</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Control data sharing and analytics preferences.
        </p>

        <div className="flex flex-col gap-4">
          {/* Analytics */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={appSettings.enableAnalytics}
                onChange={(e) => updateAppSetting('enableAnalytics', e.target.checked)}
                className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
              />
              <span className="text-sm font-medium">Enable usage analytics</span>
            </label>
            <p className="text-xs text-emperor-muted mt-1">
              Help improve Emperor by sharing anonymous usage data.
            </p>
          </div>

          {/* Error reporting */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={appSettings.enableErrorReporting}
                onChange={(e) => updateAppSetting('enableErrorReporting', e.target.checked)}
                className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
              />
              <span className="text-sm font-medium">Enable error reporting</span>
            </label>
            <p className="text-xs text-emperor-muted mt-1">
              Automatically report errors to help fix bugs.
            </p>
          </div>
        </div>
      </section>

      {/* AI Enhancements section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">AI Enhancements</h2>
        <p className="text-sm text-emperor-muted mb-4">
          Fine-tune AI-powered features.
        </p>

        <div className="flex flex-col gap-4">
          {/* Auto tagging */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={appSettings.autoTagging}
                onChange={(e) => updateAppSetting('autoTagging', e.target.checked)}
                className="w-4 h-4 text-emperor-accent bg-emperor-surface border-emperor-border rounded focus:ring-emperor-accent focus:ring-2"
              />
              <span className="text-sm font-medium">Auto-tagging</span>
            </label>
            <p className="text-xs text-emperor-muted mt-1">
              Automatically suggest tags for new bookmarks.
            </p>
          </div>

          {/* Analysis depth */}
          <div>
            <h3 className="text-sm font-medium mb-2">Analysis Depth</h3>
            <div className="flex gap-2">
              {(
                [
                  { label: "Basic", value: "basic" },
                  { label: "Detailed", value: "detailed" }
                ] as { label: string; value: AnalysisDepth }[]
              ).map((option) => {
                const isActive = appSettings.analysisDepth === option.value;
                return (
                  <button
                    key={option.value}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                        : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                    }`}
                    onClick={() => updateAppSetting('analysisDepth', option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary length */}
          <div>
            <h3 className="text-sm font-medium mb-2">Summary Length</h3>
            <div className="flex gap-2">
              {(
                [
                  { label: "Short", value: "short" },
                  { label: "Medium", value: "medium" },
                  { label: "Long", value: "long" }
                ] as { label: string; value: SummaryLength }[]
              ).map((option) => {
                const isActive = appSettings.summaryLength === option.value;
                return (
                  <button
                    key={option.value}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emperor-surfaceStrong border-emperor-accent text-emperor-text"
                        : "border-emperor-border text-emperor-muted hover:bg-emperor-surface"
                    }`}
                    onClick={() => updateAppSetting('summaryLength', option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
