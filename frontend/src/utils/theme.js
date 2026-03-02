// Theme helpers for dark mode toggle.
const THEME_KEY = "vla_theme";

export const getStoredTheme = () => localStorage.getItem(THEME_KEY) || "light";

export const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem(THEME_KEY, theme);
};
