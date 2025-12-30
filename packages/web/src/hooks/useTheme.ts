import { useEffect, useState } from "react";

/**
 * useTheme.ts
 * ------------
 * Hook for managing application theme (dark/light/system).
 * Handles theme persistence, system preference detection, and DOM updates.
 * Provides smooth transitions between theme changes.
 */

/**
 * ThemeMode Type
 * --------------
 * Available theme options for the application.
 */
export type ThemeMode = "dark" | "light" | "system";

/**
 * Extended theme object
 * ---------------------
 * Adds support for accent color while remaining backward-compatible
 * with the previous string-only storage format.
 */
export type EmperorTheme = {
  mode: ThemeMode;
  accent: string;
};

const DEFAULT_THEME: EmperorTheme = {
  mode: "system",
  accent: "#fbbf24" // Emperor gold as a sensible default accent
};

/**
 * useTheme Hook
 * -------------
 * Manages theme state and applies theme classes to the document.
 * Supports system preference detection and smooth theme transitions.
 *
 * @returns Object with theme state and setters
 */
export function useTheme() {
  // Initialize theme from localStorage or default to system
  const [theme, setTheme] = useState<EmperorTheme>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;

    const raw = localStorage.getItem("emperor-theme");

    // Backwards compatible: old string-only format ("dark" | "light" | "system")
    if (raw === "dark" || raw === "light" || raw === "system") {
      return { ...DEFAULT_THEME, mode: raw };
    }

    // New format: JSON-serialized EmperorTheme object
    try {
      const parsed = JSON.parse(raw || "{}");
      return {
        ...DEFAULT_THEME,
        ...parsed
      };
    } catch {
      return DEFAULT_THEME;
    }
  });

  // Detect current system theme preference
  const systemPrefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Resolve actual theme: if system, use system preference, else use selected theme
  const resolvedTheme: ThemeMode =
    theme.mode === "system" ? (systemPrefersDark ? "dark" : "light") : theme.mode;

  /**
   * Theme Application Effect
   * ------------------------
   * Applies theme classes to document root and persists theme choice.
   * Includes smooth transition animation for theme changes.
   */
  useEffect(() => {
    const root = document.documentElement;

    // Add transition class for smooth theme change
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);

    // Apply light theme class if light mode, remove for dark mode
    if (resolvedTheme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }

    // Apply accent color via CSS variable
    root.style.setProperty("--emperor-accent", theme.accent);

    // Persist theme choice to localStorage (full object)
    localStorage.setItem("emperor-theme", JSON.stringify(theme));
  }, [theme, resolvedTheme]);

  return { theme, setTheme, resolvedTheme };
}