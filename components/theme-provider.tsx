"use client";

import * as React from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: "class" | string | string[];
  defaultTheme?: string;
  forcedTheme?: string;
  enableColorScheme?: boolean;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "light",
  forcedTheme,
  enableColorScheme = true,
}: ThemeProviderProps) {
  React.useEffect(() => {
    const root = document.documentElement;
    const theme = forcedTheme ?? defaultTheme;

    const attributes = Array.isArray(attribute) ? attribute : [attribute];

    for (const attr of attributes) {
      if (attr === "class") {
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        continue;
      }

      root.setAttribute(attr, theme);
    }

    if (enableColorScheme && (theme === "light" || theme === "dark")) {
      root.style.colorScheme = theme;
    }
  }, [attribute, defaultTheme, forcedTheme, enableColorScheme]);

  return <>{children}</>;
}
