import type { Metadata } from "next";
import localFont from "next/font/local";

import { AuthProvider } from "@/features/auth/AuthContext";
import { AuthenticatedThemeBootstrap } from "@/features/theme/AuthenticatedThemeBootstrap";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { THEME_BOOTSTRAP_SCRIPT } from "@/features/theme/theme";
import { ToastProvider } from "@/context/ToastContext";
import DateInputGuard from "@/shared/ui/DateInputGuard";

import "./globals.css";
import "./consumer.css";

const consumerFont = localFont({
  src: "../public/fonts/NanumGothic.ttf",
  variable: "--font-consumer",
  display: "swap",
  fallback: ["Arial", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Life As Game",
  description: "Your life, gamified.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="warm-beige" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} /></head>
      <body className={`${consumerFont.variable} antialiased`}>
        <DateInputGuard />
        <AuthProvider>
          <ThemeProvider>
            <AuthenticatedThemeBootstrap />
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
