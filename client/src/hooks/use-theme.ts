import { useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "replit-theme";

// Simple theme hook without context
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "dark";
    }
    return "dark";
  });

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);

    // Set CSS variables based on theme
    if (theme === "light") {
      root.style.setProperty("--discord-dark", "#ffffff");
      root.style.setProperty("--discord-darker", "#f8f9fa");
      root.style.setProperty("--discord-light", "#1a1a1a");
      root.style.setProperty("--discord-medium", "#6c757d");
      root.style.setProperty("--background", "hsl(0, 0%, 100%)");
      root.style.setProperty("--foreground", "hsl(20, 14.3%, 4.1%)");
      root.style.setProperty("--card", "hsl(0, 0%, 100%)");
      root.style.setProperty("--card-foreground", "hsl(20, 14.3%, 4.1%)");
      root.style.setProperty("--muted", "hsl(60, 4.8%, 95.9%)");
      root.style.setProperty("--muted-foreground", "hsl(25, 5.3%, 44.7%)");
      root.style.setProperty("--border", "hsl(20, 5.9%, 90%)");
    } else {
      root.style.setProperty("--discord-dark", "#2f3136");
      root.style.setProperty("--discord-darker", "#202225");
      root.style.setProperty("--discord-light", "#dcddde");
      root.style.setProperty("--discord-medium", "#72767d");
      root.style.setProperty("--background", "hsl(220, 8%, 13%)");
      root.style.setProperty("--foreground", "hsl(210, 9%, 87%)");
      root.style.setProperty("--card", "hsl(223, 7%, 20%)");
      root.style.setProperty("--card-foreground", "hsl(210, 9%, 87%)");
      root.style.setProperty("--muted", "hsl(223, 7%, 20%)");
      root.style.setProperty("--muted-foreground", "hsl(210, 5%, 65%)");
      root.style.setProperty("--border", "hsl(220, 7%, 23%)");
    }
  }, [theme]);

  return { theme, setTheme, toggleTheme };
}