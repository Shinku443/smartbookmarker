import React from "react";
import type { EmperorTheme, ThemeMode } from "../hooks/useTheme";
import { Button } from "./ui/Button";

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
    </div>
  );
}
