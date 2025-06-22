import { useTheme } from "../../context/ThemeContext";
import { Button } from "./Button";

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const icon = theme === "light" ? "🌙" : "☀️";
  const label = theme === "light" ? "Enable dark mode" : "Enable light mode";

  return (
    <Button
      onClick={toggleTheme}
      variant="linkLight"
      aria-label={label}
      title={label}
      className={className}
    >
      {icon}
    </Button>
  );
} 