import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

function applyThemeClass(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.style.colorScheme = t;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  setTheme: (theme) => {
    applyThemeClass(theme);
    if (typeof localStorage !== "undefined") localStorage.setItem("oc-theme", theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));

export function initTheme() {
  if (typeof window === "undefined") return;
  const stored = (localStorage.getItem("oc-theme") as Theme | null) ?? "dark";
  applyThemeClass(stored);
  useThemeStore.setState({ theme: stored });
}