import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("emperor-theme") as ThemeMode) || "system";
  });

  // Detect system theme
  const systemPrefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const resolvedTheme =
    theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;

    // Smooth theme transition
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);

    if (resolvedTheme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }

    localStorage.setItem("emperor-theme", theme);
  }, [theme, resolvedTheme]);

  return { theme, setTheme, resolvedTheme };
}
