import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  initialized: boolean;
  initialize: () => void;
  toggle: () => void;
}

const THEME_KEY = "adhyayan-theme";

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "light",
  initialized: false,
  initialize: () => {
    if (typeof window === "undefined" || get().initialized) {
      return;
    }

    const savedTheme = (window.localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
    document.documentElement.dataset.theme = savedTheme;
    set({ theme: savedTheme, initialized: true });
  },
  toggle: () => {
    if (typeof window === "undefined") {
      return;
    }

    const nextTheme: Theme = get().theme === "light" ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    set({ theme: nextTheme });
  }
}));

