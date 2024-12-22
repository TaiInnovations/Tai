import { useState, useEffect } from "react";
import { X, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "./ThemeProvider";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
  initialSettings: Settings;
}

export interface Settings {
  openaiKey: string;
  model: string;
  theme: "light" | "dark" | "system";
}

export function SettingsDialog({
  isOpen,
  onClose,
  onSave,
  initialSettings,
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
    }
  }, [isOpen, initialSettings]);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    console.log('SettingsDialog: Changing theme to:', newTheme);
    setSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">设置</h2>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label
              htmlFor="openaiKey"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              OpenAI API Key
            </label>
            <input
              id="openaiKey"
              type="password"
              value={settings.openaiKey}
              onChange={(e) =>
                setSettings({ ...settings, openaiKey: e.target.value })
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              在此输入你的 OpenAI API Key
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="model"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              模型
            </label>
            <select
              id="model"
              value={settings.model}
              onChange={(e) =>
                setSettings({ ...settings, model: e.target.value })
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-1106-preview">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
            <p className="text-xs text-muted-foreground">
              选择要使用的 AI 模型
            </p>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              主题
            </label>
            <div className="flex gap-2">
              <Button
                variant={settings.theme === "light" ? "default" : "outline"}
                className="flex-1"
                onClick={() => handleThemeChange("light")}
              >
                <Sun className="h-4 w-4 mr-2" />
                浅色
              </Button>
              <Button
                variant={settings.theme === "dark" ? "default" : "outline"}
                className="flex-1"
                onClick={() => handleThemeChange("dark")}
              >
                <Moon className="h-4 w-4 mr-2" />
                深色
              </Button>
              <Button
                variant={settings.theme === "system" ? "default" : "outline"}
                className="flex-1"
                onClick={() => handleThemeChange("system")}
              >
                <Monitor className="h-4 w-4 mr-2" />
                系统
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              选择应用的主题模式
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
