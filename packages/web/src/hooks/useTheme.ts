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
 * useTheme Hook
 * -------------
 * Manages theme state and applies theme classes to the document.
 * Supports system preference detection and smooth theme transitions.
 *
 * @returns Object with theme state and setters
 */
export function useTheme() {
  // Initialize theme from localStorage or default to system
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("emperor-theme") as ThemeMode) || "system";
  });

  // Detect current system theme preference
  const systemPrefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Resolve actual theme: if system, use system preference, else use selected theme
  const resolvedTheme =
    theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

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

    // Persist theme choice to localStorage
    localStorage.setItem("emperor-theme", theme);
  }, [theme, resolvedTheme]);

  return { theme, setTheme, resolvedTheme };
}
