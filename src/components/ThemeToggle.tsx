import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "visadrill.theme";

/** Light/dark theme toggle. Light is the default (visa-drill's look); the choice
 *  persists in localStorage and is applied to <html> (see main.tsx for the
 *  before-paint init). */
const ThemeToggle = () => {
  const [dark, setDark] = useState<boolean>(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

export default ThemeToggle;
