import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PreferencesProvider } from "./context/preferences-context";
import { SearchShortcut } from "@/components/search-shortcut";
import { GlobalHotkeyPanel } from "@/components/global-hotkey-panel";
import { SettingsModal } from "@/components/settings/settings-modal";
import { UniversalSearch } from "@/components/universal-search";
import { BetaGuard } from "@/components/beta-guard";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  title: "Cohortly",
  description: "Cohortly is a platform for managing and tracking cohorts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${playfair.variable} font-sans antialiased select-none tracking-tight leading-relaxed`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PreferencesProvider>
            <TooltipProvider>
              {children}
              <SettingsModal />
              <UniversalSearch />
              <SearchShortcut />
              <GlobalHotkeyPanel />
              <BetaGuard />
              <Toaster />
            </TooltipProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
