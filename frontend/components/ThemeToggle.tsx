import { MoonStar, SunMedium } from "lucide-react";

import { useThemeStore } from "@/store/theme-store";

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <button
      aria-label="Toggle color theme"
      className="rounded-full border border-soft bg-surface px-3 py-2 text-sm text-[var(--text)] transition hover:-translate-y-0.5"
      onClick={toggle}
      type="button"
    >
      <span className="flex items-center gap-2">
        {theme === "light" ? <MoonStar size={16} /> : <SunMedium size={16} />}
        {theme === "light" ? "Dark" : "Light"}
      </span>
    </button>
  );
}

