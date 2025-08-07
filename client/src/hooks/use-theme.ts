import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "replit-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      return saved || "system";
    }
    return "system";
  });

  const resolvedTheme = theme === "system" ? getSystemTheme() : (theme === "dark" ? "dark" : "light");

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateTheme = () => {
      const currentResolvedTheme = theme === "system" ? getSystemTheme() : (theme === "dark" ? "dark" : "light");
      
      root.classList.remove("light", "dark");
      root.classList.add(currentResolvedTheme);
    };

    updateTheme();

    // Listen for system theme changes when theme is set to "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", updateTheme);
      return () => mediaQuery.removeEventListener("change", updateTheme);
    }
  }, [theme]);

  return { theme, resolvedTheme, setTheme, toggleTheme };
}