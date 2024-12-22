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

export function getDefaultSettings(): Settings {
  return {
    openaiKey: "",
    model: "gpt-3.5-turbo",
    theme: "system",
  };
}
