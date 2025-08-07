import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "replit-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

function getResolvedTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : (theme === "dark" ? "dark" : "light");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "system";
    }
    return "system";
  });

  const resolvedTheme = getResolvedTheme(theme);

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

  // Listen for system theme changes and apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateTheme = () => {
      const currentResolvedTheme = getResolvedTheme(theme);
      
      root.classList.remove("light", "dark");
      root.classList.add(currentResolvedTheme);

      // Set CSS variables based on resolved theme
      if (currentResolvedTheme === "light") {
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