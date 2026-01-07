import { useEffect, useState } from "react";

/**
 * useAppSettings.ts
 * -----------------
 * Comprehensive settings hook for all application preferences.
 * Manages settings persistence and provides access to all configuration options.
 */

/**
 * Sort Options
 */
export type SortMethod = 'manual' | 'dateAdded' | 'dateModified' | 'alphabetical' | 'url' | 'visits' | 'lastVisited';
export type SortDirection = 'asc' | 'desc';

/**
 * Sync Frequency Options
 */
export type SyncFrequency = 'manual' | 'realtime' | 'hourly' | 'daily' | 'weekly';

/**
 * Conflict Resolution Options
 */
export type ConflictResolution = 'manual' | 'local' | 'remote' | 'newest';

/**
 * Summary Length Options
 */
export type SummaryLength = 'short' | 'medium' | 'long';

/**
 * Analysis Depth Options
 */
export type AnalysisDepth = 'basic' | 'detailed';

/**
 * Comprehensive App Settings
 */
export type AppSettings = {
  // Sorting
  defaultSortMethod: SortMethod;
  defaultSortDirection: SortDirection;

  // Display
  compactMode: boolean;
  showThumbnails: boolean;

  // Search
  searchInTitle: boolean;
  searchInUrl: boolean;
  searchInContent: boolean;
  searchInTags: boolean;
  fuzzySearch: boolean;
  autoSuggestions: boolean;

  // Sync & Backup
  autoSync: boolean;
  syncFrequency: SyncFrequency;
  conflictResolution: ConflictResolution;

  // Performance
  virtualScrollBuffer: number;
  lazyLoading: boolean;
  maxCacheSize: number;

  // Privacy & Analytics
  enableAnalytics: boolean;
  enableErrorReporting: boolean;

  // AI Enhancements
  analysisDepth: AnalysisDepth;
  autoTagging: boolean;
  summaryLength: SummaryLength;
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  // Sorting
  defaultSortMethod: 'manual',
  defaultSortDirection: 'desc',

  // Display
  compactMode: false,
  showThumbnails: true,

  // Search
  searchInTitle: true,
  searchInUrl: true,
  searchInContent: true,
  searchInTags: true,
  fuzzySearch: true,
  autoSuggestions: true,

  // Sync & Backup
  autoSync: true,
  syncFrequency: 'realtime',
  conflictResolution: 'newest',

  // Performance
  virtualScrollBuffer: 10,
  lazyLoading: true,
  maxCacheSize: 100,

  // Privacy & Analytics
  enableAnalytics: false,
  enableErrorReporting: false,

  // AI Enhancements
  analysisDepth: 'basic',
  autoTagging: true,
  summaryLength: 'medium'
};

/**
 * useAppSettings Hook
 * -------------------
 * Manages comprehensive application settings with localStorage persistence.
 *
 * @returns Object with settings state and setters
 */
export function useAppSettings() {
  // Initialize settings from localStorage or defaults
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;

    const raw = localStorage.getItem("emperor-app-settings");

    if (!raw) {
      return DEFAULT_APP_SETTINGS;
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed
      };
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  /**
   * Settings Persistence Effect
   * ---------------------------
   * Persists settings to localStorage whenever they change.
   */
  useEffect(() => {
    localStorage.setItem("emperor-app-settings", JSON.stringify(settings));
  }, [settings]);

  /**
   * Update specific setting
   */
  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Reset all settings to defaults
   */
  const resetSettings = () => {
    setSettings(DEFAULT_APP_SETTINGS);
  };

  /**
   * Export settings as JSON
   */
  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);
  };

  /**
   * Import settings from JSON
   */
  const importSettings = (jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString);
      const validated = { ...DEFAULT_APP_SETTINGS, ...imported };
      setSettings(validated);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  return {
    settings,
    setSettings,
    updateSetting,
    resetSettings,
    exportSettings,
    importSettings
  };
}
