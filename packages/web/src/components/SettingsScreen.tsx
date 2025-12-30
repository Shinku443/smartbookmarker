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
 *
 * This component is fully controlled by props and contains no persistent state.
 */

type Props = {
  /** Current theme object (mode + accent color) */
  theme: EmperorTheme;
  /** Updates the theme (mode and/or accent) */
  setTheme: (next: EmperorTheme) => void;

  /** Current edit mode for pages */
  editMode: "modal" | "inline";
  /** Updates the edit mode */
  setEditMode: (mode: "modal" | "inline") => void;

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
    </div>
  );
}