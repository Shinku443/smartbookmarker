import { useEffect, useState } from "react";

/**
 * useAISettings.ts
 * -----------------
 * Hook for managing AI settings (LLM provider and API keys).
 * Handles settings persistence and provides access to AI configuration.
 */

/**
 * AI Provider Type
 * ----------------
 * Available AI providers for LLM-powered features.
 */
export type AIProvider = "openai" | "anthropic" | "groq" | "local";

/**
 * AI Settings object
 * ------------------
 * Configuration for AI-powered features.
 */
export type AISettings = {
  provider: AIProvider;
  apiKey: string;
  useAI: boolean;
};

const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "openai",
  apiKey: "",
  useAI: false
};

/**
 * useAISettings Hook
 * ------------------
 * Manages AI settings state and persists them to localStorage.
 *
 * @returns Object with AI settings state and setters
 */
export function useAISettings() {
  // Initialize AI settings from localStorage or defaults
  const [settings, setSettings] = useState<AISettings>(() => {
    if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;

    const raw = localStorage.getItem("emperor-ai-settings");

    if (!raw) {
      return DEFAULT_AI_SETTINGS;
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_AI_SETTINGS,
        ...parsed
      };
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  });

  /**
   * Settings Persistence Effect
   * ---------------------------
   * Persists AI settings to localStorage whenever they change.
   */
  useEffect(() => {
    localStorage.setItem("emperor-ai-settings", JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
}
