import type { Settings } from "../components/SettingsDialog";

const SETTINGS_KEY = "app-settings";

export async function loadSettings(): Promise<Settings> {
  try {
    const settingsStr = localStorage.getItem(SETTINGS_KEY);
    if (!settingsStr) {
      const defaultSettings = getDefaultSettings();
      console.log('Settings: No settings found, using defaults:', defaultSettings);
      return defaultSettings;
    }
    const settings = JSON.parse(settingsStr);
    console.log('Settings: Loading settings:', settings);
    return settings as Settings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    const defaultSettings = getDefaultSettings();
    console.log('Settings: Error loading settings, using defaults:', defaultSettings);
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    console.log('Settings: Saving settings:', settings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.log('Settings: Settings saved successfully');
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}

export const AVAILABLE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-exp-1206:free",
  "google/gemini-exp-1121:free",
  "google/learnlm-1.5-pro-experimental:free",
  "google/gemini-exp-1114:free",
  "google/gemini-2.0-flash-thinking-exp:free",
] as const;

export type AvailableModel = typeof AVAILABLE_MODELS[number];

export function getDefaultSettings(): Settings {
  return {
    openRouterKey: "",
    model: AVAILABLE_MODELS[0],
    theme: "system",
  };
}
