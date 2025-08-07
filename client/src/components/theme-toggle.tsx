import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    if (theme === "light") {
      return <Moon className="w-5 h-5" />;
    } else if (theme === "dark") {
      return <Monitor className="w-5 h-5" />;
    } else {
      return <Sun className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    if (theme === "light") {
      return "Koyu temaya geç";
    } else if (theme === "dark") {
      return "Sistem varsayılanına geç";
    } else {
      return "Açık temaya geç";
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm" 
      onClick={toggleTheme}
      className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-2"
      title={getTitle()}
    >
      {getIcon()}
    </Button>
  );
}