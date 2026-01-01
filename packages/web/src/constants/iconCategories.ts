// src/constants/iconCategories.ts

/**
 * ICON_CATEGORIES
 * ----------------
 * Centralized list of emoji/icon categories for the Change Icon modal.
 * Keeping this in a constants file allows:
 *   - Reuse across components
 *   - Easy expansion
 *   - Cleaner modal code
 */

export const ICON_CATEGORIES: Record<string, string[]> = {
  "Color Circles": ["🔴", "⚪", "🔵", "🟢", "🟡", "🟠", "🟣", "⚫"],

  "Flat Fun": [
    "🌐", "🧮", "📅", "👤", "📁",
    "🗺️", "🛍️", "⏰", "🐦", "📷"
  ],

  "Hockey": [
    "🥅", "🏒", "⛸️", "🏆",
    "🧤", "👕", "🧍‍♂️", "🧍‍♀️"
  ],

  "Landscape": [
    "🌅", "🏞️", "🏖️", "🌄",
    "🌇", "🏜️", "🌲", "🏙️"
  ]
};