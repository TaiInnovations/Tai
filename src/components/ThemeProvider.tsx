import { createContext, useContext, useEffect, useState } from "react";
import { loadSettings } from "../lib/settings";

export type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function updateTheme(theme: Theme) {
  const root = window.document.documentElement;
  const isDark = theme === "dark" || 
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // 移除所有主题相关的类
  root.classList.remove("light", "dark");
  
  // 添加新的主题类
  if (isDark) {
    root.classList.add("dark");
  }

  // 强制重新计算样式
  const body = document.body;
  const backgroundColor = window.getComputedStyle(body).backgroundColor;
  body.style.backgroundColor = "transparent";
  void body.offsetHeight; // 触发重排
  body.style.backgroundColor = backgroundColor;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // 从设置中加载主题
  useEffect(() => {
    loadSettings().then((settings) => {
      console.log('ThemeProvider: Loading theme from settings:', settings.theme);
      setThemeState(settings.theme);
      updateTheme(settings.theme);
    });
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // 当主题改变时更新
  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      console.log('ThemeProvider: Setting new theme:', newTheme);
      setThemeState(newTheme);
      updateTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
