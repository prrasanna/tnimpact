import { Moon, Sun } from "lucide-react";

// Reusable dark mode toggle button.
function DarkModeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

export default DarkModeToggle;
